/**
 * Pure function — converts rule content with moustache tokens to sanitized HTML.
 * Uses data-rule-number on links so the parent container's event delegation handles
 * hover popups and click navigation without any per-link Vue listeners.
 *
 * Rule links resolve either in the owning module (bare `{{L:1.2}}`) or in an
 * explicitly named module (`{{L:core:3.4}}`). The owning module context is carried
 * on the rendered container as a `data-rule-context` attribute, so the document-level
 * delegation resolves bare links against the content's own module.
 *
 * Text is interpreted as Markdown. Raw HTML is allowed through the Markdown
 * renderer for legacy imported content, then the whole result is sanitized with
 * DOMPurify so stored content can never execute script.
 */

import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

export interface RenderContentOptions {
  acronymPopups?: boolean
  /**
   * Render as block Markdown (paragraphs, lists, headings). Defaults to inline
   * Markdown, which is safe inside headings, table cells, and labels.
   */
  block?: boolean
}

export interface RuleLinkModifiers {
  moduleSlug?: string
  /** Owning module id — provides context for bare `{{L:number}}` links. */
  moduleId?: string
}

const apiBase: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost/api'

const RULE_LINK_CLASS =
  'underline decoration-dotted cursor-pointer text-primary font-medium hover:text-primary/80 transition-colors'

const markdown = new MarkdownIt({
  html: true,
  linkify: false,
  breaks: true,
  typographer: false,
})

/**
 * Whitelisted `[color:name]…[/color]` values. Each maps to a static Tailwind
 * class so the value is never interpolated into a style or arbitrary class.
 */
const COLOR_CLASSES: Record<string, string> = {
  red: 'text-red-400',
  orange: 'text-orange-400',
  amber: 'text-amber-400',
  yellow: 'text-yellow-400',
  lime: 'text-lime-400',
  green: 'text-green-400',
  emerald: 'text-emerald-400',
  teal: 'text-teal-400',
  cyan: 'text-cyan-400',
  sky: 'text-sky-400',
  blue: 'text-blue-400',
  indigo: 'text-indigo-400',
  violet: 'text-violet-400',
  purple: 'text-purple-400',
  fuchsia: 'text-fuchsia-400',
  pink: 'text-pink-400',
  rose: 'text-rose-400',
  gray: 'text-gray-400',
  muted: 'text-muted-foreground',
}

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'del',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'span',
  'img',
  'hr',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  'sub',
  'sup',
]

const ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'class',
  'title',
  'target',
  'rel',
  'colspan',
  'rowspan',
  'data-rule-number',
  'data-rule-range',
  'data-rule-module',
  'data-acronym-term',
]

const SANITIZE_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'svg', 'math'],
  FORBID_ATTR: [
    'style',
    'onerror',
    'onload',
    'onclick',
    'onmouseover',
    'onfocus',
    'onmouseenter',
  ],
}

export function renderContent(content: string, options?: RenderContentOptions): string {
  if (content === '') return ''

  const { source, tokens } = extractTokens(content, options, 0)
  const rendered = options?.block ? markdown.render(source) : markdown.renderInline(source)

  return DOMPurify.sanitize(restoreTokens(rendered, tokens), SANITIZE_CONFIG)
}

/**
 * Replace every custom construct with an inert placeholder before Markdown
 * parsing. The generated HTML is stashed and restored after parsing so the
 * Markdown renderer cannot mangle token labels or escape our markup.
 */
function extractTokens(
  content: string,
  options: RenderContentOptions | undefined,
  depth: number,
): { source: string; tokens: string[] } {
  const tokens: string[] = []
  const stash = (html: string): string => {
    const index = tokens.length
    tokens.push(html)
    return `\uE000OLGUR${index}\uE001`
  }

  let source = content

  // [color:red]…[/color] — whitelisted colors only.
  source = source.replace(
    /\[color:([a-zA-Z]+)\]([\s\S]*?)\[\/color\]/gi,
    (match: string, name: string, inner: string): string => {
      const className = COLOR_CLASSES[name.toLowerCase()]
      if (!className || depth > 5) return match
      const innerHtml = renderInlineFragment(inner, options, depth + 1)
      return stash(`<span class="${className}">${innerHtml}</span>`)
    },
  )

  // <ex>…</ex> — example blocks.
  source = source.replace(
    /<ex>([\s\S]*?)<\/ex>/gi,
    (_match: string, inner: string): string =>
      stash(
        `<span class="example-block">EX: ${renderInlineFragment(inner.trim(), options, depth + 1)}</span>`,
      ),
  )

  // {{I:key}} — rule images.
  source = source.replace(/\{\{I:([^}]+)\}\}/g, (_match: string, key: string): string => {
    const src = `${apiBase}/rules/images/${encodeURIComponent(key)}.png`
    return stash(
      `<img src="${escapeHtml(src)}" alt="${escapeHtml(key)}" class="rule-image float-left mr-2" />`,
    )
  })

  // {{A:TERM}} and {{L:…}}.
  source = source.replace(
    /\{\{([A-Z]):([^}]+)\}\}/g,
    (match: string, prefix: string, key: string): string => {
      if (prefix === 'A') {
        if (options?.acronymPopups === false) return escapeHtml(key)
        return stash(
          `<span data-acronym-term="${escapeHtml(key)}" class="underline decoration-dotted cursor-help text-primary/80">${escapeHtml(key)}</span>`,
        )
      }
      if (prefix === 'L') return stash(renderRuleLink(key))
      return match
    },
  )

  return { source, tokens }
}

function renderInlineFragment(
  content: string,
  options: RenderContentOptions | undefined,
  depth: number,
): string {
  const { source, tokens } = extractTokens(content, options, depth)
  return restoreTokens(markdown.renderInline(source), tokens)
}

function restoreTokens(html: string, tokens: string[]): string {
  let restored = html
  for (const [index, token] of tokens.entries()) {
    restored = restored.split(`\uE000OLGUR${index}\uE001`).join(token)
  }
  return restored
}

/**
 * Render a `{{L:...}}` token's key into a rule link.
 *
 * The key may be a bare number (`1.2`), a number with a custom label
 * (`1.2#Label`), a module-qualified number (`core:3.4`), a range
 * (`1.2-1.4`), or a module-qualified range (`core:1.2-1.4`).
 */
function renderRuleLink(key: string): string {
  const hashIdx = key.indexOf('#')
  const ref = hashIdx === -1 ? key : key.slice(0, hashIdx)
  const label = hashIdx === -1 ? null : key.slice(hashIdx + 1)
  const display = label ?? ref

  const colonIdx = ref.indexOf(':')
  if (colonIdx !== -1) {
    const slug = ref.slice(0, colonIdx)
    const numOrRange = ref.slice(colonIdx + 1)
    return ruleLinkElement(numOrRange, display, { moduleSlug: slug })
  }

  return ruleLinkElement(ref, display, {})
}

function ruleLinkElement(
  numOrRange: string,
  display: string,
  modifiers: RuleLinkModifiers,
): string {
  const modAttr = modifiers.moduleSlug
    ? ` data-rule-module="${escapeHtml(modifiers.moduleSlug)}"`
    : ''

  if (numOrRange.includes('-')) {
    return `<a data-rule-range="${escapeHtml(numOrRange)}"${modAttr} class="${RULE_LINK_CLASS}">${escapeHtml(display)}</a>`
  }

  return `<a data-rule-number="${escapeHtml(numOrRange)}"${modAttr} class="${RULE_LINK_CLASS}">${escapeHtml(display)}</a>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
