import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Controls the full-screen tool modal (Task 5). Tools (Unit Data, Ordnance vs
 * Armor, and bespoke system tools) open here instead of the removed bottom
 * panel. Only the modal's open state and the active tool id live here; each
 * tool's internal UI state is backed by its own store (e.g. `unitBrowser`).
 */
export const useToolModalStore = defineStore('toolModal', () => {
  const isOpen = ref(false)
  const activeToolId = ref('')

  function open(toolId: string): void {
    activeToolId.value = toolId
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
  }

  return { isOpen, activeToolId, open, close }
})
