import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Controls the full-screen game-data modals (Task 6). The SOP modal and the
 * Table Browser modal replace the removed right-hand game-data drawer. Only
 * open/close state and the currently selected table id live here; each
 * surface's per-record UI state (SOP expand/search, active tab) is backed by
 * `gameDataPanel`.
 */
export const useGameDataModalStore = defineStore('gameDataModal', () => {
  const sopOpen = ref(false)
  const tableBrowserOpen = ref(false)
  const selectedTableId = ref('')

  function openSop(): void {
    sopOpen.value = true
  }

  function closeSop(): void {
    sopOpen.value = false
  }

  function openTableBrowser(): void {
    tableBrowserOpen.value = true
  }

  function closeTableBrowser(): void {
    tableBrowserOpen.value = false
  }

  /**
   * Open the Table Browser showing a specific table by id. Used by the
   * Table Browser listing (Task 7) to drill into a single table.
   */
  function selectTable(id: string): void {
    selectedTableId.value = id
    tableBrowserOpen.value = true
  }

  return {
    sopOpen,
    tableBrowserOpen,
    selectedTableId,
    openSop,
    closeSop,
    openTableBrowser,
    closeTableBrowser,
    selectTable,
  }
})
