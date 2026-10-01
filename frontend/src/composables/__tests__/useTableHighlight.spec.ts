import { describe, it, expect } from 'vitest'
import { useTableHighlight } from '@/composables/useTableHighlight'

describe('useTableHighlight', () => {
  it('starts with no active row or column', () => {
    const { active } = useTableHighlight()

    expect(active.value).toEqual({ row: null, col: null })
  })

  it('sets the active row and column on hover', () => {
    const { onCellEnter, active, isRowActive, isColActive } = useTableHighlight()

    onCellEnter('row1', 'col1')

    expect(active.value).toEqual({ row: 'row1', col: 'col1' })
    expect(isRowActive('row1')).toBe(true)
    expect(isColActive('col1')).toBe(true)
  })

  it('clears the hovered cell on leave', () => {
    const { onCellEnter, onCellLeave, active } = useTableHighlight()

    onCellEnter('row1', 'col1')
    onCellLeave()

    expect(active.value).toEqual({ row: null, col: null })
  })

  it('pins a cell on click', () => {
    const { onCellClick, pinned } = useTableHighlight()

    onCellClick('row2', 'col2')

    expect(pinned.value).toEqual({ row: 'row2', col: 'col2' })
  })

  it('unpins when clicking the already-pinned cell', () => {
    const { onCellClick, pinned } = useTableHighlight()

    onCellClick('row2', 'col2')
    onCellClick('row2', 'col2')

    expect(pinned.value).toEqual({ row: null, col: null })
  })

  it('pins a different cell when clicking a new cell', () => {
    const { onCellClick, pinned } = useTableHighlight()

    onCellClick('row1', 'col1')
    onCellClick('row2', 'col2')

    expect(pinned.value).toEqual({ row: 'row2', col: 'col2' })
  })

  it('prefers the pinned cell over the hovered cell in active', () => {
    const { onCellEnter, onCellClick, active } = useTableHighlight()

    onCellEnter('rowH', 'colH')
    onCellClick('rowP', 'colP')

    expect(active.value).toEqual({ row: 'rowP', col: 'colP' })
  })

  it('clear() resets both hovered and pinned state', () => {
    const { onCellEnter, onCellClick, clear, hovered, pinned, active } = useTableHighlight()

    onCellEnter('row1', 'col1')
    onCellClick('row2', 'col2')
    clear()

    expect(hovered.value).toEqual({ row: null, col: null })
    expect(pinned.value).toEqual({ row: null, col: null })
    expect(active.value).toEqual({ row: null, col: null })
  })
})
