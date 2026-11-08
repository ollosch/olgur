import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GameDatum } from '@/types/domain'

/**
 * Persists the Unit Data browser's search/filter state and current selection
 * outside of the component tree, so it survives the Bottom Panel being
 * closed and reopened (the panel content is destroyed/recreated on toggle).
 */
export const useUnitBrowserStore = defineStore('unitBrowser', () => {
  const search = ref('')
  const activeLetter = ref<string | null>(null)
  const typeFilter = ref<'all' | 'vehicle' | 'ordnance'>('all')
  const nationFilter = ref<string>('all')
  const selectedUnit = ref<GameDatum | null>(null)
  const detailView = ref<'detail' | 'counter'>('detail')

  return { search, activeLetter, typeFilter, nationFilter, selectedUnit, detailView }
})
