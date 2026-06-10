import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { loadBool, loadString, saveItem } from '@/lib/storage'

export interface BottomPanelTab {
  id: string
  label: string
  icon: string
}

export const useBottomPanelStore = defineStore('bottomPanel', () => {
  const isOpen = ref(false)
  const isPinned = ref(loadBool('panel-bottom-pinned', false))
  const tabs = ref<BottomPanelTab[]>([])
  const activeTabId = ref(loadString('panel-bottom-active-tab', ''))

  watch(isPinned, (val) => saveItem('panel-bottom-pinned', String(val)))
  watch(activeTabId, (val) => saveItem('panel-bottom-active-tab', val))

  function open(): void {
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
  }

  function toggle(): void {
    isOpen.value = !isOpen.value
  }

  function pin(): void {
    isPinned.value = true
  }

  function unpin(): void {
    isPinned.value = false
  }

  function setActiveTab(id: string): void {
    activeTabId.value = id
  }

  function registerTab(tab: BottomPanelTab): void {
    if (!tabs.value.some((t) => t.id === tab.id)) {
      tabs.value.push(tab)
      // Set first registered tab as active if none set
      if (!activeTabId.value) {
        activeTabId.value = tab.id
      }
    }
  }

  return {
    isOpen,
    isPinned,
    tabs,
    activeTabId,
    open,
    close,
    toggle,
    pin,
    unpin,
    setActiveTab,
    registerTab,
  }
})
