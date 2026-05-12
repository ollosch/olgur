/**
 * Pure function — converts rule content with moustache tokens to an HTML string.
 * Uses data-rule-number on links so the parent container's event delegation handles
 * hover popups and click navigation without any per-link Vue listeners.
 */

const apiBase: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost/api'

export function renderContent(content: string, options?: { acronymPopups?: boolean }): string {
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
        const hashIdx = key.indexOf('#')
        if (hashIdx !== -1) {
          const ruleNumber = key.slice(0, hashIdx)
          const linkName = key.slice(hashIdx + 1)
          return `<a data-rule-number="${escapeHtml(ruleNumber)}" class="underline decoration-dotted cursor-pointer text-primary font-medium hover:text-primary/80 transition-colors">${escapeHtml(linkName)}</a>`
        }
        if (key.includes('-')) {
          return `<a data-rule-range="${escapeHtml(key)}" class="underline decoration-dotted cursor-pointer text-primary font-medium hover:text-primary/80 transition-colors">${escapeHtml(key)}</a>`
        }
        return `<a data-rule-number="${escapeHtml(key)}" class="underline decoration-dotted cursor-pointer text-primary font-medium hover:text-primary/80 transition-colors">${escapeHtml(key)}</a>`
      }
      return escapeHtml(_match)
    })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
