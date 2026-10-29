import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'
import UnitDataTab from '@/components/layout/UnitDataTab.vue'
import { useUnitSelectionStore } from '@/stores/unitSelection'
import { useUnitBrowserStore } from '@/stores/unitBrowser'
import type { GameDatum } from '@/types/domain'

function makeUnit(id: string): GameDatum {
  return {
    id,
    module_id: 'mod1',
    type: 'vehicle',
    slug: id,
    name: `Unit ${id}`,
    content: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

describe('UnitDataTab pending selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('consumes a pending unit present at mount', () => {
    const selectionStore = useUnitSelectionStore()
    const browserStore = useUnitBrowserStore()
    const unit = makeUnit('u1')
    selectionStore.selectUnit(unit)

    shallowMount(UnitDataTab)

    expect(browserStore.selectedUnit).toEqual(unit)
    expect(selectionStore.pendingUnit).toBeNull()
  })

  it('consumes a pending unit selected after mount', async () => {
    const selectionStore = useUnitSelectionStore()
    const browserStore = useUnitBrowserStore()
    shallowMount(UnitDataTab)

    const unit = makeUnit('u2')
    selectionStore.selectUnit(unit)
    await nextTick()

    expect(browserStore.selectedUnit).toEqual(unit)
    expect(selectionStore.pendingUnit).toBeNull()
  })
})
