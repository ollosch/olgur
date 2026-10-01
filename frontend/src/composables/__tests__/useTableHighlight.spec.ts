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

  describe('cellState', () => {
    it('returns "none" when no cell is active', () => {
      const { cellState } = useTableHighlight()
      expect(cellState('r', 'c')).toBe('none')
    })

    it('returns "active" for the active cell', () => {
      const { onCellEnter, cellState } = useTableHighlight()
      onCellEnter('r', 'c')
      expect(cellState('r', 'c')).toBe('active')
    })

    it('returns "row" for a sibling cell in the active row', () => {
      const { onCellEnter, cellState } = useTableHighlight()
      onCellEnter('r', 'c')
      expect(cellState('r', 'other')).toBe('row')
    })

    it('returns "col" for a sibling cell in the active column', () => {
      const { onCellEnter, cellState } = useTableHighlight()
      onCellEnter('r', 'c')
      expect(cellState('other', 'c')).toBe('col')
    })
  })

  describe('cellClasses', () => {
    it('returns the active class for the active cell', () => {
      const { onCellEnter, cellClasses } = useTableHighlight()
      onCellEnter('r', 'c')
      expect(cellClasses('r', 'c')).toBe('bg-primary/30')
    })

    it('returns the attenuated class for row and column siblings', () => {
      const { onCellEnter, cellClasses } = useTableHighlight()
      onCellEnter('r', 'c')
      expect(cellClasses('r', 'other')).toBe('bg-primary/10')
      expect(cellClasses('other', 'c')).toBe('bg-primary/10')
    })

    it('returns an empty string for unrelated cells', () => {
      const { onCellEnter, cellClasses } = useTableHighlight()
      onCellEnter('r', 'c')
      expect(cellClasses('x', 'y')).toBe('')
    })
  })

  describe('rowHeaderClasses / colHeaderClasses', () => {
    it('returns the header class only when the header is active', () => {
      const { onCellEnter, rowHeaderClasses, colHeaderClasses } = useTableHighlight()
      onCellEnter('r', 'c')

      expect(rowHeaderClasses('r')).toBe('bg-primary/15')
      expect(rowHeaderClasses('other')).toBe('')
      expect(colHeaderClasses('c')).toBe('bg-primary/15')
      expect(colHeaderClasses('other')).toBe('')
    })
  })
})
