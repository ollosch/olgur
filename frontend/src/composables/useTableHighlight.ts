import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

export interface CellHighlight {
  row: string | null
  col: string | null
}

/**
 * Row/column highlight state for matrix tables. Hover sets the active cell;
 * clicking pins it (so it survives mouse leave), and clicking the already-pinned
 * cell unpins it. `active` resolves to the pinned cell when set, otherwise the
 * hovered cell.
 */
export function useTableHighlight(): {
  hovered: Ref<CellHighlight>
  pinned: Ref<CellHighlight>
  active: ComputedRef<CellHighlight>
  onCellEnter: (row: string, col: string) => void
  onCellLeave: () => void
  onCellClick: (row: string, col: string) => void
  clear: () => void
  isRowActive: (row: string) => boolean
  isColActive: (col: string) => boolean
} {
  const hovered: Ref<CellHighlight> = ref({ row: null, col: null })
  const pinned: Ref<CellHighlight> = ref({ row: null, col: null })

  const active: ComputedRef<CellHighlight> = computed(() => {
    if (pinned.value.row !== null || pinned.value.col !== null) {
      return pinned.value
    }
    return hovered.value
  })

  function onCellEnter(row: string, col: string): void {
    hovered.value = { row, col }
  }

  function onCellLeave(): void {
    hovered.value = { row: null, col: null }
  }

  function onCellClick(row: string, col: string): void {
    if (pinned.value.row === row && pinned.value.col === col) {
      pinned.value = { row: null, col: null }
    } else {
      pinned.value = { row, col }
    }
  }

  function clear(): void {
    hovered.value = { row: null, col: null }
    pinned.value = { row: null, col: null }
  }

  function isRowActive(row: string): boolean {
    return active.value.row === row
  }

  function isColActive(col: string): boolean {
    return active.value.col === col
  }

  return {
    hovered,
    pinned,
    active,
    onCellEnter,
    onCellLeave,
    onCellClick,
    clear,
    isRowActive,
    isColActive,
  }
}
