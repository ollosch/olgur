import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useShortcutStore = defineStore('shortcut', () => {
  /** True when the global search Command overlay is open */
  const overlayOpen = ref(false)
  /** Incremented when any dialog (other than search overlay) is open */
  const modalCount = ref(0)

  const shortcutsBlocked = computed(() => overlayOpen.value || modalCount.value > 0)

  return { overlayOpen, shortcutsBlocked, modalCount }
})
