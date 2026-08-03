import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface SopUiState {
  searchQuery: string
  expandedPhases: Set<string>
  preGameExpanded: boolean
  expandedGroups: Set<string>
}

function createSopUiState(): SopUiState {
  return {
    searchQuery: '',
    expandedPhases: new Set(),
    preGameExpanded: false,
    expandedGroups: new Set(),
  }
}

/**
 * Persists the right-hand Game Data drawer's UI state (active tab, and
 * per-SOP expand/collapse + search state) outside of the component tree, so
 * it survives the drawer's Sheet being closed and reopened (unpinned mode
 * unmounts its content) as well as switching between tabs.
 *
 * Extensible: Tables UI state (once it needs more than the active tab, e.g.
 * per-table expand/collapse) can be added here the same way SOP state is.
 */
export const useGameDataPanelStore = defineStore('gameDataPanel', () => {
  const activeTableId = ref('')
  const activeSopId = ref('')
  const sopUiState = ref<Record<string, SopUiState>>({})

  function getSopState(sopId: string): SopUiState {
    let state = sopUiState.value[sopId]
    if (!state) {
      state = createSopUiState()
      sopUiState.value[sopId] = state
    }
    return state
  }

  return { activeTableId, activeSopId, sopUiState, getSopState }
})
