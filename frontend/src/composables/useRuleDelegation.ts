import { onMounted, onUnmounted } from 'vue'
import { useRulePopup } from '@/composables/useRulePopup'
import { useAppSettingsStore } from '@/stores/appSettings'
import type { Rule, IndexEntry } from '@/types/domain'

/**
 * Attaches a single document-level mouseover listener.
 * - [data-rule-number]  → rule popup on hover, navigate on click
 * - [data-acronym-term] → acronym popup on hover
 * - Inside popup overlay → keep open
 * - Anything else       → hide
 *
 * Zero per-link Vue listeners. No container-boundary issues.
 */
export function useRuleDelegation(
  getRulesMap: () => Map<string, Rule>,
  onSelect: (rule: Rule) => void,
  getIndexEntriesMap?: () => Map<string, IndexEntry>,
) {
  const { state, hide, keepOpen } = useRulePopup()
  const appSettings = useAppSettingsStore()
  let showTimer: ReturnType<typeof setTimeout> | null = null
  let activeEl: HTMLElement | null = null

  function popupX(rect: DOMRect): number {
    const maxW = 320
    const margin = 16
    let left = rect.left
    if (left + maxW > window.innerWidth - margin) {
      left = Math.max(8, window.innerWidth - maxW - margin)
    }
    return left
  }

  function onDocMouseOver(e: MouseEvent) {
    if (!(e.target instanceof HTMLElement)) return
    const target = e.target

    // Inside the popup — keep it open and do nothing else
    if (target.closest('[data-popup-overlay]')) {
      keepOpen()
      return
    }

    const trigger =
      target.closest<HTMLElement>('[data-rule-number]') ??
      target.closest<HTMLElement>('[data-acronym-term]')

    if (!trigger) {
      if (showTimer) { clearTimeout(showTimer); showTimer = null }
      activeEl = null
      hide()
      return
    }

    // Trigger found — cancel any pending hide before doing anything else
    keepOpen()

    if (trigger === activeEl) return // still on same trigger

    activeEl = trigger
    if (showTimer) { clearTimeout(showTimer); showTimer = null }

    const rect = trigger.getBoundingClientRect()

    if (trigger.dataset['ruleNumber'] !== undefined) {
      const number = trigger.dataset['ruleNumber'] ?? ''
      showTimer = setTimeout(() => {
        showTimer = null
        const rule = getRulesMap().get(number)
        if (rule) {
          state.value = { visible: true, content: { type: 'rule', rule }, x: popupX(rect), y: rect.bottom + 6 }
        }
      }, 150)
    } else if (trigger.dataset['acronymTerm'] !== undefined) {
      if (!appSettings.acronymPopups) return
      const term = trigger.dataset['acronymTerm'] ?? ''
      showTimer = setTimeout(() => {
        showTimer = null
        const entry = getIndexEntriesMap?.().get(term)
        if (entry) {
          state.value = { visible: true, content: { type: 'acronym', entry }, x: popupX(rect), y: rect.bottom + 6 }
        }
      }, 150)
    }
  }

  function onDocClick(e: MouseEvent) {
    if (!(e.target instanceof HTMLElement)) return
    const anchor = e.target.closest<HTMLElement>('[data-rule-number]')
    if (!anchor) return
    // Don't navigate clicks inside the popup — those are handled by the overlay
    if (anchor.closest('[data-popup-overlay]')) return
    e.preventDefault()
    const rule = getRulesMap().get(anchor.dataset['ruleNumber'] ?? '')
    if (rule) onSelect(rule)
  }

  onMounted(() => {
    document.addEventListener('mouseover', onDocMouseOver)
    document.addEventListener('click', onDocClick)
  })

  onUnmounted(() => {
    document.removeEventListener('mouseover', onDocMouseOver)
    document.removeEventListener('click', onDocClick)
  })
}
