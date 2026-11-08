import type { MarkdownIt, StateBlock } from 'markdown-it'

type RuleBlock = (state: StateBlock, startLine: number, endLine: number, silent: boolean) => boolean

type Attrs = Record<string, string>

const OPEN_RE = /^ {0,3}:::[ \t]+([a-zA-Z][\w-]*)(?:[ \t]+(.*?))?[ \t]*$/
const CLOSE_RE = /^ {0,3}:::[ \t]*$/

const MARKER_CLASSES: Record<string, string> = {
  diamond: 'rule-list--diamond',
  check: 'rule-list--check',
}

const DIRECTIVES: Record<string, (attrs: Attrs) => string | null> = {
  list: (attrs) => {
    const marker = (attrs.marker ?? 'diamond').toLowerCase()
    const markerClass = MARKER_CLASSES[marker]
    return markerClass ? `rule-list ${markerClass}` : null
  },
}

function parseAttrs(input: string): Attrs {
  const attrs: Attrs = {}
  for (const match of input.matchAll(/([a-zA-Z][\w-]*)=(?:"([^"]*)"|'([^']*)'|(\S+))/g)) {
    attrs[match[1]!.toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return attrs
}

const directiveRule: RuleBlock = (state, startLine, endLine, silent) => {
  if (state.sCount[startLine]! - state.blkIndent >= 4) return false

  const start = state.bMarks[startLine]! + state.tShift[startLine]!
  const max = state.eMarks[startLine]!
  const line = state.src.slice(start, max)
  const open = OPEN_RE.exec(line)
  if (!open) return false

  const name = open[1]!.toLowerCase()
  const resolve = DIRECTIVES[name]
  if (!resolve) return false
  if (silent) return true

  const className = resolve(parseAttrs(open[2] ?? ''))
  if (!className) return false

  let nextLine = startLine + 1
  for (; nextLine < endLine; nextLine++) {
    const lineStart = state.bMarks[nextLine]! + state.tShift[nextLine]!
    const lineEnd = state.eMarks[nextLine]!
    if (CLOSE_RE.test(state.src.slice(lineStart, lineEnd))) break
  }
  if (nextLine >= endLine) return false

  const oldParentType = state.parentType
  state.parentType = 'blockquote'

  const tokenOpen = state.push('directive_open', 'div', 1)
  tokenOpen.block = true
  tokenOpen.map = [startLine, nextLine]
  tokenOpen.attrJoin('class', className)
  tokenOpen.markup = ':::'
  tokenOpen.info = line.slice(start + 3).trim()

  state.md.block.tokenize(state, startLine + 1, nextLine)

  const tokenClose = state.push('directive_close', 'div', -1)
  tokenClose.block = true
  tokenClose.markup = ':::'

  state.parentType = oldParentType
  state.line = nextLine + 1
  return true
}

/**
 * Adds a small `:::` directive container to markdown-it.
 *
 * Current directives:
 * - `::: list marker=diamond` (default) — diamond bullet list.
 * - `::: list marker=check` — check-mark requirements list.
 *
 * Unknown directives and markers are left as literal text, so typos stay visible.
 */
export function markdownDirectives(md: MarkdownIt): void {
  md.block.ruler.before('fence', 'directive', directiveRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  })
}
