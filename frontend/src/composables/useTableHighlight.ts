import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

export interface CellHighlight {
  row: string | null
  col: string | null
}

export type CellState = 'active' | 'row' | 'col' | 'none'

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
  cellState: (row: string, col: string) => CellState
  cellClasses: (row: string, col: string) => string
  rowHeaderClasses: (row: string) => string
  colHeaderClasses: (col: string) => string
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

  function cellState(row: string, col: string): CellState {
    const current = active.value
    if (current.row === row && current.col === col) return 'active'
    if (current.row === row) return 'row'
    if (current.col === col) return 'col'
    return 'none'
  }

  function cellClasses(row: string, col: string): string {
    switch (cellState(row, col)) {
      case 'active':
        return 'bg-primary/30'
      case 'row':
      case 'col':
        return 'bg-primary/10'
      default:
        return ''
    }
  }

  function rowHeaderClasses(row: string): string {
    return isRowActive(row) ? 'bg-primary/15' : ''
  }

  function colHeaderClasses(col: string): string {
    return isColActive(col) ? 'bg-primary/15' : ''
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
    cellState,
    cellClasses,
    rowHeaderClasses,
    colHeaderClasses,
  }
}
