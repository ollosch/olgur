import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToolModalStore } from '@/stores/toolModal'
import { useGameDataModalStore } from '@/stores/gameDataModal'
import { useGameDataPanelStore } from '@/stores/gameDataPanel'

/**
 * Modal state persistence (Task 8). Each full-screen modal keeps its state in a
 * store so closing the modal (which hides its content) never destroys user
 * state — the same store object is read again on reopen. These tests assert
 * that open/close toggling never clears the backed state.
 */
describe('modal state persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tool modal keeps its active tool across close and reopen', () => {
    const store = useToolModalStore()

    store.open('vehicle')
    expect(store.isOpen).toBe(true)
    expect(store.activeToolId).toBe('vehicle')

    store.close()
    expect(store.isOpen).toBe(false)
    expect(store.activeToolId).toBe('vehicle')

    store.open('vehicle')
    expect(store.isOpen).toBe(true)
    expect(store.activeToolId).toBe('vehicle')
  })

  it('table browser keeps its selected table across close and reopen', () => {
    const store = useGameDataModalStore()

    store.selectTable('t1')
    expect(store.tableBrowserOpen).toBe(true)
    expect(store.selectedTableId).toBe('t1')

    store.closeTableBrowser()
    expect(store.tableBrowserOpen).toBe(false)
    expect(store.selectedTableId).toBe('t1')

    store.openTableBrowser()
    expect(store.tableBrowserOpen).toBe(true)
    expect(store.selectedTableId).toBe('t1')
  })

  it('SOP modal keeps the active SOP id across close and reopen', () => {
    const modal = useGameDataModalStore()
    const panel = useGameDataPanelStore()

    panel.activeSopId = 'sop-2'
    modal.openSop()
    expect(modal.sopOpen).toBe(true)

    modal.closeSop()
    expect(modal.sopOpen).toBe(false)
    expect(panel.activeSopId).toBe('sop-2')
  })

  it('SOP expand/search state is stable across reopen', () => {
    const panel = useGameDataPanelStore()

    const state = panel.getSopState('sop-1')
    state.searchQuery = 'night'
    state.expandedPhases.add('rally')
    state.preGameExpanded = true

    // Reopen reads the same backing state object, mutations intact.
    const reopened = panel.getSopState('sop-1')
    expect(reopened).toBe(state)
    expect(reopened.searchQuery).toBe('night')
    expect(reopened.expandedPhases.has('rally')).toBe(true)
    expect(reopened.preGameExpanded).toBe(true)
  })
})
