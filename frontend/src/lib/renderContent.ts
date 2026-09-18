/**
 * Pure function — converts rule content with moustache tokens to an HTML string.
 * Uses data-rule-number on links so the parent container's event delegation handles
 * hover popups and click navigation without any per-link Vue listeners.
 *
 * Rule links resolve either in the owning module (bare `{{L:1.2}}`) or in an
 * explicitly named module (`{{L:core:3.4}}`). The owning module context is carried
 * on the rendered container as a `data-rule-context` attribute, so the document-level
 * delegation resolves bare links against the content's own module.
 */

export interface RenderContentOptions {
  acronymPopups?: boolean
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

export function renderContent(content: string, options?: RenderContentOptions): string {
  return content
    .replace(/<ex>([\s\S]*?)<\/ex>/g, (_match, inner: string) => {
      return `<span class="example-block">EX: ${inner.trim()}</span>`
    })
    .replace(/\{\{I:([^}]+)\}\}/g, (_match, key: string) => {
      const src = `${apiBase}/rules/images/${encodeURIComponent(key)}.png`
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(key)}" class="rule-image float-left mr-2" />`
    })
    .replace(/\{\{([A-Z]):([^}]+)\}\}/g, (_match, prefix: string, key: string) => {
      if (prefix === 'A') {
        if (options?.acronymPopups === false) {
          return escapeHtml(key)
        }
        return `<span data-acronym-term="${escapeHtml(key)}" class="underline decoration-dotted cursor-help text-primary/80">${escapeHtml(key)}</span>`
      }
      if (prefix === 'L') {
        return renderRuleLink(key)
      }
      return escapeHtml(_match)
    })
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
}
