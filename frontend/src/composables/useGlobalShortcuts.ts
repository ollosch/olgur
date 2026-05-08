import { onMounted, onUnmounted } from 'vue'
import { useShortcutStore } from '@/stores/shortcut'
import { useLeftPanelStore } from '@/stores/leftPanel'

export function useGlobalShortcuts(): void {
  const shortcutStore = useShortcutStore()
  const panelStore = useLeftPanelStore()

  function isFocusInInput(): boolean {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable
  }

  function onKeyDown(e: KeyboardEvent): void {
    // Ctrl+K — open overlay
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      if (isFocusInInput()) return
      e.preventDefault()
      shortcutStore.overlayOpen = true
      return
    }

    // Escape — close overlay
    if (e.key === 'Escape' && shortcutStore.overlayOpen) {
      shortcutStore.overlayOpen = false
      return
    }

    // Single-key shortcuts — suppressed when blocked, in input, or any modifier is held
    if (shortcutStore.shortcutsBlocked || isFocusInInput()) return
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return

    switch (e.key) {
      case 'f':
        e.preventDefault()
        shortcutStore.overlayOpen = true
        break
      case 'i':
        e.preventDefault()
        panelStore.openToTab('index')
        break
      case 'b':
        e.preventDefault()
        panelStore.openToTab('bookmarks')
        break
      case 'h':
        e.preventDefault()
        panelStore.openToTab('history')
        break
      case 't':
        e.preventDefault()
        panelStore.openToTab('tree')
        panelStore.treeActivatedTick++
        break
    }
  }

  onMounted(() => document.addEventListener('keydown', onKeyDown))
  onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
}
