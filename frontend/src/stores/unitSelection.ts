import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GameDatum } from '@/types/domain'

/**
 * Holds a unit that was selected from GlobalSearch so the UnitDataTab
 * can open it immediately when the bottom panel activates.
 */
export const useUnitSelectionStore = defineStore('unitSelection', () => {
  const pendingUnit = ref<GameDatum | null>(null)

  function selectUnit(item: GameDatum): void {
    pendingUnit.value = item
  }

  function consumePendingUnit(): GameDatum | null {
    const unit = pendingUnit.value
    pendingUnit.value = null
    return unit
  }

  return {
    pendingUnit,
    selectUnit,
    consumePendingUnit,
  }
})
