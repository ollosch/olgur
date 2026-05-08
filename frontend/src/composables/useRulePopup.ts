import { ref } from 'vue'
import type { Rule, IndexEntry } from '@/types/domain'

export type PopupContent =
  | { type: 'rule'; rule: Rule }
  | { type: 'acronym'; entry: IndexEntry }

interface PopupState {
  visible: boolean
  content: PopupContent | null
  x: number
  y: number
}

// Module-level singleton — one instance shared across the entire app
const state = ref<PopupState>({ visible: false, content: null, x: 0, y: 0 })
let hideTimer: ReturnType<typeof setTimeout> | null = null
let showTimer: ReturnType<typeof setTimeout> | null = null

// Registered by SystemView so the popup can navigate without knowing the store
let navigateHandler: ((rule: Rule) => void) | null = null
let navigateRangeHandler: ((fromRule: Rule, toRule: Rule) => void) | null = null
let rulesMapRef: (() => Map<string, Rule>) | null = null
let indexEntriesMapRef: (() => Map<string, IndexEntry>) | null = null

export function useRulePopup() {
  function hide() {
    if (showTimer) { clearTimeout(showTimer); showTimer = null }
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
    hideTimer = setTimeout(() => {
      state.value.visible = false
      hideTimer = null
    }, 300)
  }

  function keepOpen() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  }

  function registerNavigate(
    fn: (rule: Rule) => void,
    getRulesMap: () => Map<string, Rule>,
    getIndexEntriesMap?: () => Map<string, IndexEntry>,
    navigateRange?: (fromRule: Rule, toRule: Rule) => void,
  ) {
    navigateHandler = fn
    rulesMapRef = getRulesMap
    if (getIndexEntriesMap) indexEntriesMapRef = getIndexEntriesMap
    if (navigateRange) navigateRangeHandler = navigateRange
  }

  function navigateToNumber(number: string) {
    const rule = rulesMapRef?.().get(number)
    if (rule) {
      state.value.visible = false
      navigateHandler?.(rule)
    }
  }

  /**
   * Navigate to a rule range given a range string like "B.28.5-B.28.5.3".
   * The separator is the first "-" in the string.
   */
  function navigateToRange(rangeString: string) {
    const separatorIndex = rangeString.indexOf('-')
    if (separatorIndex === -1) {
      navigateToNumber(rangeString)
      return
    }

    const fromNumber = rangeString.slice(0, separatorIndex)
    const toNumber = rangeString.slice(separatorIndex + 1)
    const rulesMap = rulesMapRef?.() ?? new Map()
    const fromRule = rulesMap.get(fromNumber)
    const toRule = rulesMap.get(toNumber)

    if (fromRule && toRule) {
      state.value.visible = false
      navigateRangeHandler?.(fromRule, toRule)
    } else if (fromRule) {
      state.value.visible = false
      navigateHandler?.(fromRule)
    }
  }

  function getRulesMap(): Map<string, Rule> {
    return rulesMapRef?.() ?? new Map()
  }

  function getIndexEntriesMap(): Map<string, IndexEntry> {
    return indexEntriesMapRef?.() ?? new Map()
  }

  return {
    state,
    hide,
    keepOpen,
    registerNavigate,
    navigateToNumber,
    navigateToRange,
    getRulesMap,
    getIndexEntriesMap,
  }
}
