import { watch, toRef, onUnmounted, type MaybeRefOrGetter } from 'vue'
import { useShortcutStore } from '@/stores/shortcut'

/**
 * Calls `shortcutStore.openModal()` while the given open value is true,
 * and `shortcutStore.closeModal()` when the dialog closes. Call this inside
 * any dialog component that should suppress global keyboard shortcuts.
 */
export function useModalShortcutGuard(open: MaybeRefOrGetter<boolean>): void {
  const shortcutStore = useShortcutStore()
  const isOpen = toRef(open)
  let isModalOpen = false

  watch(isOpen, (openNow) => {
    if (openNow === isModalOpen) return
    isModalOpen = openNow
    if (openNow) {
      shortcutStore.openModal()
    } else {
      shortcutStore.closeModal()
    }
  })

  onUnmounted(() => {
    if (isModalOpen) {
      shortcutStore.closeModal()
    }
  })
}
