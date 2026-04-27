import { defineStore } from 'pinia'
import { ref } from 'vue'

export type PanelTab = 'tree' | 'index' | 'bookmarks' | 'history'

export const useLeftPanelStore = defineStore('leftPanel', () => {
  const activeTab = ref<PanelTab>('tree')
  const mobileOpen = ref(false)

  function openToTab(tab: PanelTab): void {
    activeTab.value = tab
    mobileOpen.value = true
  }

  return { activeTab, mobileOpen, openToTab }
})
