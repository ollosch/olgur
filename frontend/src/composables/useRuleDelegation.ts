import { onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useInteractionStore } from '@/stores/interaction'
import type { RuleLinkModifiers } from '@/lib/renderContent'
import { useContentStore } from '@/stores/content'
import type { Rule, IndexEntry } from '@/types/domain'

/**
 * Attaches a single document-level mouseover listener.
 * - [data-rule-number]  → rule popup on hover, navigate on click
 * - [data-rule-range]   → range popup on hover, navigate to range on click
 * - [data-acronym-term] → acronym popup on hover
 * - Inside popup overlay → keep open
 * - Anything else       → hide
 *
 * Zero per-link Vue listeners. No container-boundary issues.
 *
 * Rule references resolve in a module context supplied by the rendered
 * container: either an explicit `data-rule-module` slug (`{{L:core:3.4}}`) or
 * the owning module carried as a container-level `data-rule-context` attribute
 * for bare `{{L:1.2}}` links.
 */
export function useRuleDelegation(
  onSelect: (rule: Rule) => void,
  getIndexEntriesMap?: () => Map<string, IndexEntry>,
) {
  const interactionStore = useInteractionStore()
  const { popupState: state } = storeToRefs(interactionStore)
  const appSettings = useAppSettingsStore()
  const contentStore = useContentStore()
  let showTimer: ReturnType<typeof setTimeout> | null = null
  let activeEl: HTMLElement | null = null

  function linkModifiers(el: HTMLElement): RuleLinkModifiers {
    return {
      moduleSlug: el.dataset['ruleModule'] ?? undefined,
      moduleId: el.closest<HTMLElement>('[data-rule-context]')?.dataset['ruleContext'] ?? undefined,
    }
  }

  function popupX(rect: DOMRect): number {
    const maxW = 320
    const margin = 16
    let left = rect.left
    if (left + maxW > window.innerWidth - margin) {
      left = Math.max(8, window.innerWidth - maxW - margin)
    }
    return left
  }

  /** Estimated popup height used to decide whether to render above or below. */
  const POPUP_HEIGHT_ESTIMATE = 260

  function popupY(rect: DOMRect): { y: number; above: boolean } {
    const above = rect.bottom + POPUP_HEIGHT_ESTIMATE > window.innerHeight
    return { y: above ? rect.top - 6 : rect.bottom + 6, above }
  }

  function onDocMouseOver(e: MouseEvent) {
    if (!window.matchMedia('(hover: hover)').matches) return
    if (!(e.target instanceof HTMLElement)) return
    const target = e.target

    // Inside the popup — keep it open and do nothing else
    if (target.closest('[data-popup-overlay]')) {
      interactionStore.keepOpen()
      return
    }

    const trigger =
      target.closest<HTMLElement>('[data-rule-number]') ??
      target.closest<HTMLElement>('[data-rule-range]') ??
      target.closest<HTMLElement>('[data-acronym-term]')

    if (!trigger) {
      if (showTimer) {
        clearTimeout(showTimer)
        showTimer = null
      }
      activeEl = null
      interactionStore.hide()
      return
    }

    // Trigger found — cancel any pending hide before doing anything else
    interactionStore.keepOpen()

    if (trigger === activeEl) return // still on same trigger

    activeEl = trigger
    if (showTimer) {
      clearTimeout(showTimer)
      showTimer = null
    }

    const rect = trigger.getBoundingClientRect()

    if (trigger.dataset['ruleNumber'] !== undefined) {
      const number = trigger.dataset['ruleNumber'] ?? ''
      const opts = linkModifiers(trigger)
      showTimer = setTimeout(() => {
        showTimer = null
        const rule = contentStore.resolveRuleReference(number, opts)
        if (rule) {
          const { y, above } = popupY(rect)
          state.value = {
            visible: true,
            content: { type: 'rule', rule },
            x: popupX(rect),
            y,
            above,
          }
        }
      }, 150)
    } else if (trigger.dataset['ruleRange'] !== undefined) {
      const rangeString = trigger.dataset['ruleRange'] ?? ''
      const opts = linkModifiers(trigger)
      showTimer = setTimeout(() => {
        showTimer = null
        const sep = rangeString.indexOf('-')
        if (sep === -1) return
        const fromNumber = rangeString.slice(0, sep)
        const toNumber = rangeString.slice(sep + 1)
        const fromRule = contentStore.resolveRuleReference(fromNumber, opts)
        const toRule = contentStore.resolveRuleReference(toNumber, opts)
        if (!fromRule || !toRule) return
        const flattened = contentStore.flattenedRulesByModule.get(fromRule.module_id) ?? []
        const fromIdx = flattened.findIndex((r) => r.id === fromRule.id)
        const toIdx = flattened.findIndex((r) => r.id === toRule.id)
        const rules =
          fromIdx !== -1 && toIdx >= fromIdx
            ? flattened.slice(fromIdx, toIdx + 1)
            : [fromRule, toRule]
        const { y, above } = popupY(rect)
        state.value = {
          visible: true,
          content: { type: 'range', rules },
          x: popupX(rect),
          y,
          above,
        }
      }, 150)
    } else if (trigger.dataset['acronymTerm'] !== undefined) {
      if (!appSettings.acronymPopups) return
      const term = trigger.dataset['acronymTerm'] ?? ''
      showTimer = setTimeout(() => {
        showTimer = null
        const entry = getIndexEntriesMap?.().get(term)
        if (entry) {
          const { y, above } = popupY(rect)
          state.value = {
            visible: true,
            content: { type: 'acronym', entry },
            x: popupX(rect),
            y,
            above,
          }
        }
      }, 150)
    }
  }

  function onDocClick(e: MouseEvent) {
    if (!(e.target instanceof HTMLElement)) return

    const rangeAnchor = e.target.closest<HTMLElement>('[data-rule-range]')
    if (rangeAnchor && !rangeAnchor.closest('[data-popup-overlay]')) {
      e.preventDefault()
      interactionStore.navigateToRange(
        rangeAnchor.dataset['ruleRange'] ?? '',
        linkModifiers(rangeAnchor),
      )
      return
    }

    const anchor = e.target.closest<HTMLElement>('[data-rule-number]')
    if (!anchor) return
    // Don't navigate clicks inside the popup — those are handled by the overlay
    if (anchor.closest('[data-popup-overlay]')) return
    e.preventDefault()
    const rule = contentStore.resolveRuleReference(
      anchor.dataset['ruleNumber'] ?? '',
      linkModifiers(anchor),
    )
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
