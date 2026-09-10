import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Rule, IndexEntry } from '@/types/domain'

export type PopupContent =
  | { type: 'rule'; rule: Rule }
  | { type: 'range'; rules: Rule[] }
  | { type: 'acronym'; entry: IndexEntry }
  | { type: 'inactive_module' }

interface PopupState {
  visible: boolean
  content: PopupContent | null
  x: number
  y: number
  above: boolean
}

export interface RuleLinkModifiers {
  moduleSlug?: string
  contextModuleId?: string
}

type RuleResolver = (number: string, opts?: RuleLinkModifiers) => Rule | null

/**
 * Owns all shared popup state that was previously scattered as module-level
 * globals in useRulePopup.ts. Non-reactive handles (timers, registered
 * callbacks) are kept as private closure variables — not returned — so they
 * are encapsulated but persist for the lifetime of the store.
 */
export const useInteractionStore = defineStore('interaction', () => {
  const popupState = ref<PopupState>({ visible: false, content: null, x: 0, y: 0, above: false })

  // Non-reactive private closure state (not exposed on the store object)
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let showTimer: ReturnType<typeof setTimeout> | null = null

  // Navigation callbacks registered once by SystemView
  let navigateHandler: ((rule: Rule) => void) | null = null
  let navigateRangeHandler: ((fromRule: Rule, toRule: Rule) => void) | null = null
  let resolveRuleRef: RuleResolver | null = null
  let indexEntriesMapRef: (() => Map<string, IndexEntry>) | null = null

  function hide(): void {
    if (showTimer) {
      clearTimeout(showTimer)
      showTimer = null
    }
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
    hideTimer = setTimeout(() => {
      popupState.value.visible = false
      hideTimer = null
    }, 300)
  }

  function keepOpen(): void {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function registerNavigate(
    fn: (rule: Rule) => void,
    resolveRule: RuleResolver,
    indexEntriesMapGetter?: () => Map<string, IndexEntry>,
    navigateRange?: (fromRule: Rule, toRule: Rule) => void,
  ): void {
    navigateHandler = fn
    resolveRuleRef = resolveRule
    if (indexEntriesMapGetter) indexEntriesMapRef = indexEntriesMapGetter
    if (navigateRange) navigateRangeHandler = navigateRange
  }

  function navigateToNumber(number: string, opts?: RuleLinkModifiers): void {
    const rule = resolveRuleRef?.(number, opts)
    if (rule) {
      popupState.value.visible = false
      navigateHandler?.(rule)
    }
  }

  /**
   * Navigate to a rule range given a range string like "B.28.5-B.28.5.3".
   * The separator is the first "-" in the string.
   */
  function navigateToRange(rangeString: string, opts?: RuleLinkModifiers): void {
    const separatorIndex = rangeString.indexOf('-')
    if (separatorIndex === -1) {
      navigateToNumber(rangeString, opts)
      return
    }

    const fromNumber = rangeString.slice(0, separatorIndex)
    const toNumber = rangeString.slice(separatorIndex + 1)
    const fromRule = resolveRuleRef?.(fromNumber, opts) ?? null
    const toRule = resolveRuleRef?.(toNumber, opts) ?? null

    if (fromRule && toRule) {
      popupState.value.visible = false
      navigateRangeHandler?.(fromRule, toRule)
    } else if (fromRule) {
      popupState.value.visible = false
      navigateHandler?.(fromRule)
    }
  }

  function getIndexEntriesMap(): Map<string, IndexEntry> {
    return indexEntriesMapRef?.() ?? new Map<string, IndexEntry>()
  }

  return {
    popupState,
    hide,
    keepOpen,
    registerNavigate,
    navigateToNumber,
    navigateToRange,
    getIndexEntriesMap,
  }
})
