import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAppSettingsStore } from '@/stores/appSettings'
import { BREAKPOINT_MD } from '@/lib/utils'

export type PanelTab = 'tree' | 'index' | 'bookmarks' | 'history' | 'proofread'

export const useLeftPanelStore = defineStore('leftPanel', () => {
  const appSettings = useAppSettingsStore()
  const activeTab = ref<PanelTab>('tree')
  const mobileOpen = ref(false)

  /** Module accordion state — which module sections are expanded in the tree */
  const expandedModuleIds = ref<Set<string>>(new Set())

  /** Rule node state — which rule nodes are expanded in the tree */
  const expandedRuleIds = ref<Set<string>>(new Set())

  /**
   * When set, the tree tab should scroll to and focus the node with this rule ID.
   * Consumers clear this after focusing.
   */
  const pendingFocusRuleId = ref<string | null>(null)

  /**
   * Incremented each time the `t` shortcut fires. Watched by SystemView to
   * expand ancestors of the selected rule before setting pendingFocusRuleId.
   */
  const treeActivatedTick = ref(0)

  /**
   * When set, the next tree activation should reveal this specific rule (rather
   * than the currently selected rule). Set by the "Show in tree" button and
   * cleared by SystemView once consumed.
   */
  const revealRuleId = ref<string | null>(null)

  function openToTab(tab: PanelTab): void {
    activeTab.value = tab
    if (!appSettings.sidebarPinned && window.innerWidth < BREAKPOINT_MD) {
      mobileOpen.value = true
    }
  }

  return {
    activeTab,
    mobileOpen,
    expandedModuleIds,
    expandedRuleIds,
    pendingFocusRuleId,
    treeActivatedTick,
    revealRuleId,
    openToTab,
  }
})
