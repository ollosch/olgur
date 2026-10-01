import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

const GAP = 4
const MORE_BTN_WIDTH = 40

export interface OverflowResult {
  visibleToolIds: string[]
  hiddenToolIds: string[]
  visibleBookmarkIds: string[]
  hiddenBookmarkIds: string[]
}

/**
 * Pure sizing decision for the toolbar. Fits tool buttons first (left-to-right),
 * then bookmark buttons, reserving the group's "More" button width when that
 * group overflows. The rightmost items of a group overflow into its dropdown.
 */
export function computeOverflow(
  toolIds: string[],
  bookmarkIds: string[],
  toolWidths: Map<string, number>,
  bookmarkWidths: Map<string, number>,
  available: number,
): OverflowResult {
  const toolW = (id: string | undefined): number => (id === undefined ? 0 : (toolWidths.get(id) ?? 0))
  const bookmarkW = (id: string | undefined): number =>
    id === undefined ? 0 : (bookmarkWidths.get(id) ?? 0)

  let used = 0
  let toolN = 0
  for (let i = 0; i < toolIds.length; i++) {
    const width = toolW(toolIds[i]) + (i > 0 ? GAP : 0)
    if (used + width <= available) {
      used += width
      toolN++
    } else {
      break
    }
  }

  let toolConsumed: number
  if (toolN < toolIds.length) {
    used = 0
    toolN = 0
    const budget = available - MORE_BTN_WIDTH - GAP
    for (let i = 0; i < toolIds.length; i++) {
      const width = toolW(toolIds[i]) + (i > 0 ? GAP : 0)
      if (used + width <= budget) {
        used += width
        toolN++
      } else {
        break
      }
    }
    toolConsumed = used + GAP + MORE_BTN_WIDTH
  } else {
    toolConsumed = used
  }

  let bookmarkN = 0
  used = toolConsumed
  for (let i = 0; i < bookmarkIds.length; i++) {
    const width = bookmarkW(bookmarkIds[i]) + GAP
    if (used + width <= available) {
      used += width
      bookmarkN++
    } else {
      break
    }
  }

  if (bookmarkN < bookmarkIds.length) {
    bookmarkN = 0
    used = toolConsumed
    const budget = available - MORE_BTN_WIDTH - GAP
    for (let i = 0; i < bookmarkIds.length; i++) {
      const width = bookmarkW(bookmarkIds[i]) + GAP
      if (used + width <= budget) {
        used += width
        bookmarkN++
      } else {
        break
      }
    }
  }

  return {
    visibleToolIds: toolIds.slice(0, toolN),
    hiddenToolIds: toolIds.slice(toolN),
    visibleBookmarkIds: bookmarkIds.slice(0, bookmarkN),
    hiddenBookmarkIds: bookmarkIds.slice(bookmarkN),
  }
}

export function useToolbarOverflow(
  toolItems: Readonly<Ref<readonly { id: string }[]>>,
  bookmarkItems: Readonly<Ref<readonly { id: string }[]>>,
) {
  const containerRef = ref<HTMLElement | null>(null)
  const toolEls = new Map<string, HTMLElement>()
  const bookmarkEls = new Map<string, HTMLElement>()
  const toolWidths = new Map<string, number>()
  const bookmarkWidths = new Map<string, number>()

  const allToolIds = (): string[] => toolItems.value.map((t) => t.id)
  const allBookmarkIds = (): string[] => bookmarkItems.value.map((b) => b.id)

  const result = ref<OverflowResult>({
    visibleToolIds: allToolIds(),
    hiddenToolIds: [],
    visibleBookmarkIds: allBookmarkIds(),
    hiddenBookmarkIds: [],
  })

  function registerTool(id: string) {
    return (el: unknown): void => {
      if (el instanceof HTMLElement) toolEls.set(id, el)
      else toolEls.delete(id)
    }
  }

  function registerBookmark(id: string) {
    return (el: unknown): void => {
      if (el instanceof HTMLElement) bookmarkEls.set(id, el)
      else bookmarkEls.delete(id)
    }
  }

  function measureWidths(): void {
    toolWidths.clear()
    for (const [id, el] of toolEls) {
      if (el.isConnected) toolWidths.set(id, el.offsetWidth)
    }
    bookmarkWidths.clear()
    for (const [id, el] of bookmarkEls) {
      if (el.isConnected) bookmarkWidths.set(id, el.offsetWidth)
    }
  }

  function compute(): void {
    const el = containerRef.value
    if (!el) return
    const hasItems = toolItems.value.length + bookmarkItems.value.length > 0
    const hasWidths = toolWidths.size + bookmarkWidths.size > 0
    if (hasItems && !hasWidths) return
    result.value = computeOverflow(
      allToolIds(),
      allBookmarkIds(),
      toolWidths,
      bookmarkWidths,
      el.clientWidth,
    )
  }

  let observer: ResizeObserver | null = null

  onMounted(() => {
    const el = containerRef.value
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => compute())
      observer.observe(el)
    }
    nextTick(() => {
      measureWidths()
      compute()
    })
  })

  onBeforeUnmount(() => observer?.disconnect())

  watch(
    [toolItems, bookmarkItems],
    () => {
      result.value = {
        visibleToolIds: allToolIds(),
        hiddenToolIds: [],
        visibleBookmarkIds: allBookmarkIds(),
        hiddenBookmarkIds: [],
      }
      nextTick(() => {
        measureWidths()
        compute()
      })
    },
    { deep: true },
  )

  return {
    containerRef,
    registerTool,
    registerBookmark,
    visibleToolIds: computed(() => result.value.visibleToolIds),
    hiddenToolIds: computed(() => result.value.hiddenToolIds),
    visibleBookmarkIds: computed(() => result.value.visibleBookmarkIds),
    hiddenBookmarkIds: computed(() => result.value.hiddenBookmarkIds),
  }
}
