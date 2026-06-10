import { watch, toRef, type MaybeRefOrGetter } from 'vue'
import { useShortcutStore } from '@/stores/shortcut'

/**
 * Calls `shortcutStore.openModal()` while the given open value is true,
 * and `shortcutStore.closeModal()` when the dialog closes. Call this inside
 * any dialog component that should suppress global keyboard shortcuts.
 */
export function useModalShortcutGuard(open: MaybeRefOrGetter<boolean>): void {
  const shortcutStore = useShortcutStore()

  watch(toRef(open), (isOpen) => {
    if (isOpen) {
      shortcutStore.openModal()
    } else {
      shortcutStore.closeModal()
    }
  })
}
