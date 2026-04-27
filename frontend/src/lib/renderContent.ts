/**
 * Pure function — converts rule content with moustache tokens to an HTML string.
 * Uses data-rule-number on links so the parent container's event delegation handles
 * hover popups and click navigation without any per-link Vue listeners.
 */
export function renderContent(content: string, options?: { acronymPopups?: boolean }): string {
  return content
    .replace(/\{\{([A-Z]):([^}]+)\}\}/g, (_match, prefix: string, key: string) => {
      if (prefix === 'A') {
        if (options?.acronymPopups === false) {
          return escapeHtml(key)
        }
        return `<span data-acronym-term="${escapeHtml(key)}" class="underline decoration-dotted cursor-help text-primary/80">${escapeHtml(key)}</span>`
      }
      if (prefix === 'L') {
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
