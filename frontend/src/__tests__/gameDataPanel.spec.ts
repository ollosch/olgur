import { createPinia, setActivePinia } from 'pinia'
import { isReactive } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameDataPanelStore } from '@/stores/gameDataPanel'

describe('game data panel store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns reactive state when creating SOP UI state', () => {
    const state = useGameDataPanelStore().getSopState('sop-1')

    expect(isReactive(state)).toBe(true)
    expect(isReactive(state.expandedPhases)).toBe(true)
  })
})
