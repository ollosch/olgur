import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Discriminated union of all possible "main panel" navigation states.
 * Extend this as new panels are added (calculator, tables, etc.).
 */
export type NavigationEntry = { view: 'rule'; ruleId: string }
// Future: | { view: 'calculator' } | { view: 'tables'; tableId?: string }

const HISTORY_CAP = 200

/**
 * In-system navigation store.
 *
 * Owns a pointer-based history stack that is entirely decoupled from the
 * browser URL. The browser stays on /systems/:systemId at all times; the
 * mouse back/forward buttons are intercepted by SystemView and drive this
 * store instead of the browser's own history.
 *
 * Call reset() when entering a new system.
 */
export const useSystemNavStore = defineStore('systemNav', () => {
  const stack = ref<NavigationEntry[]>([])
  const cursor = ref(-1)

  const current = computed((): NavigationEntry | null => stack.value[cursor.value] ?? null)
  const canGoBack = computed(() => cursor.value > 0)
  const canGoForward = computed(() => cursor.value < stack.value.length - 1)

  /**
   * Push a new entry and truncate any forward history (same semantics as a
   * real browser: navigating after going back discards the forward stack).
   */
  function navigate(entry: NavigationEntry): void {
    stack.value = stack.value.slice(0, cursor.value + 1)
    stack.value.push(entry)
    if (stack.value.length > HISTORY_CAP) {
      stack.value.shift()
    }
    cursor.value = stack.value.length - 1
  }

  function back(): void {
    if (canGoBack.value) cursor.value--
  }

  function forward(): void {
    if (canGoForward.value) cursor.value++
  }

  function reset(): void {
    stack.value = []
    cursor.value = -1
  }

  return { stack, cursor, current, canGoBack, canGoForward, navigate, back, forward, reset }
})
