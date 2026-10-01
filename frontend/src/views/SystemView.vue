<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useContentStore } from '@/stores/content'
import { useHistoryStore } from '@/stores/history'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { useProofreadStore } from '@/stores/proofread'
import { useSystemStore } from '@/stores/system'
import { useToolModalStore } from '@/stores/toolModal'
import { useGameDataModalStore } from '@/stores/gameDataModal'
import { useRuleDelegation } from '@/composables/useRuleDelegation'
import { useResizablePanel } from '@/composables/useResizablePanel'
import { useOnline } from '@/composables/useOnline'
import { useInteractionStore } from '@/stores/interaction'
import { requestLeaveSystemConfirmation } from '@/composables/useLeaveSystemConfirm'
import { renderContent } from '@/lib/renderContent'
import type { Rule, Module } from '@/types/domain'

import LeftPanelContent from '@/components/systems/LeftPanelContent.vue'
import SystemHeader from '@/components/systems/SystemHeader.vue'
import ToolModal from '@/components/ToolModal.vue'
import SopModal from '@/components/game-data/SopModal.vue'
import TableBrowserModal from '@/components/game-data/TableBrowserModal.vue'
import VersionStatusBadge from '@/components/versions/VersionStatusBadge.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const contentStore = useContentStore()
const appSettings = useAppSettingsStore()
const panelStore = useLeftPanelStore()
const historyStore = useHistoryStore()
const proofreadStore = useProofreadStore()
const toolModalStore = useToolModalStore()
const gameDataModalStore = useGameDataModalStore()

const systemId = computed(() => route.params['systemId'] as string)
const loading = ref(true)

const { onOnline } = useOnline()

// ---------------------------------------------------------------------------
// Left panel resize
// ---------------------------------------------------------------------------

const {
  size: leftPanelWidth,
  isDragging: leftDragging,
  startResize: onLeftDragStart,
} = useResizablePanel({
  storageKey: 'panel-left-width',
  defaultSize: 288,
  min: 200,
  max: 480,
  direction: 'horizontal',
})

const leftPanelStyle = computed(() => ({
  width: `${leftPanelWidth.value}px`,
  minWidth: `${leftPanelWidth.value}px`,
}))

// ---------------------------------------------------------------------------
// System loading
//
// SystemView is mounted once per /systems/:systemId and stays mounted while
// navigating between child routes (rule/:ruleId, future table/:tableId, etc.).
// Re-enters the system only when systemId actually changes.
// ---------------------------------------------------------------------------

async function loadSystem(id: string): Promise<void> {
  const previousId = systemStore.currentSystem?.id

  if (previousId === id) {
    loading.value = false
    // The system context is already loaded — this happens when the user
    // navigated to HomeView and back to the same system. Its store data is
    // intentionally kept around (see history clearing below), but any module
    // subscribed to in the meantime still needs its rules/index/game-data fetched.
    const loaded = await contentStore.fetchMissingModules(id, systemStore.modules)
    for (const m of loaded) {
      panelStore.expandedModuleIds.add(m.id)
    }
    await fetchProofreadStatus(id)
    return
  }

  loading.value = true

  // Genuinely switching to a different system: unload the previous one so
  // its rule-browsing history doesn't leak into the new context. Merely
  // passing through HomeView and back to the *same* system must not clear it.
  if (previousId) {
    historyStore.clearSystem(previousId)
    proofreadStore.clear()
    contentStore.clear()
  }

  await systemStore.enterSystem(id)

  // Fetch the versioned manifest before loading content so that fetchRules /
  // fetchIndexEntries / fetchGameData can route players to static file URLs.
  await contentStore.fetchManifest(id)

  const activeModuleList = contentStore.activeModules

  await Promise.allSettled([
    ...activeModuleList.map((m) => contentStore.fetchRules(id, m.id)),
    ...activeModuleList.map((m) => contentStore.fetchIndexEntries(id, m.id)),
    ...activeModuleList.map((m) => contentStore.fetchGameData(id, m.id)),
  ])

  for (const m of activeModuleList) {
    panelStore.expandedModuleIds.add(m.id)
  }

  await fetchProofreadStatus(id)

  loading.value = false
}

async function fetchProofreadStatus(id: string): Promise<void> {
  if (!proofreadStore.canProofread) return
  await proofreadStore.fetchStatus(id)
}

// Re-enter the live system on reconnect so permissions and content reflect
// fresh server data instead of stale cached/snapshot content.
async function reconnect(): Promise<void> {
  const id = systemId.value
  if (systemStore.currentSystem?.id !== id) return

  try {
    await systemStore.enterSystem(id)
    await contentStore.fetchManifest(id)
    await contentStore.refreshContent(id)
    await fetchProofreadStatus(id)
  } catch {
    // A failed reconnect leaves cached content in place.
  }
}

let unregisterOnline: (() => void) | undefined

onMounted(() => {
  loadSystem(systemId.value)
  unregisterOnline = onOnline(reconnect)
})

onBeforeUnmount(() => {
  unregisterOnline?.()
})

// Handle direct URL navigation between different systems
watch(systemId, (newId) => loadSystem(newId))

// Re-fetch content when the draft/release view mode changes
watch(
  () => contentStore.viewMode,
  async () => {
    if (systemStore.currentSystem?.id !== systemId.value) return
    await contentStore.refreshContent(systemId.value)
  },
)

// Re-fetch content when the "currently played" module selection changes so the
// composed view (TOC, tree, SOP) reflects the newly scoped active modules.
watch(
  () => contentStore.selectedModuleId,
  async () => {
    if (loading.value) return
    if (systemStore.currentSystem?.id !== systemId.value) return
    const loaded = await contentStore.fetchMissingModules(systemId.value, contentStore.activeModules)
    for (const m of loaded) {
      panelStore.expandedModuleIds.add(m.id)
    }
  },
)

// ---------------------------------------------------------------------------
// Confirm before leaving to HomeView
//
// Leaving the system for HomeView is easy to trigger by accident (repeated
// browser "back" presses). Ask for confirmation first; the rule-browsing
// history is intentionally NOT cleared here — it is only cleared when the
// system is actually unloaded (see loadSystem above).
// ---------------------------------------------------------------------------

onBeforeRouteLeave(async (to) => {
  if (to.name !== 'home') return true
  return requestLeaveSystemConfirmation()
})

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

/**
 * The currently displayed rule (if any), derived from the active child route.
 * Used by the left panel tree for highlighting and by the history recorder.
 */
const selectedRule = computed((): Rule | null => {
  const ruleId = route.params['ruleId'] as string | undefined
  if (!ruleId) return null
  return contentStore.rulesById.get(ruleId) ?? null
})

// ---------------------------------------------------------------------------
// History recording
// ---------------------------------------------------------------------------

watch(
  () => route.params['ruleId'] as string | undefined,
  (ruleId) => {
    if (!ruleId) return
    const rule = contentStore.rulesById.get(ruleId)
    const id = systemStore.currentSystem?.id
    if (!rule || !id) return
    historyStore.record({
      type: 'rule',
      id: rule.id,
      systemId: id,
      title: rule.title,
      number: rule.number,
    })
  },
)

// ---------------------------------------------------------------------------
// Tree tab focus: expand ancestors of selected rule when 't' shortcut fires
// ---------------------------------------------------------------------------

watch(
  () => panelStore.treeActivatedTick,
  async () => {
    const revealId = panelStore.revealRuleId
    panelStore.revealRuleId = null

    const rule = revealId
      ? (contentStore.rulesById.get(revealId) ?? null)
      : selectedRule.value

    if (!rule) {
      panelStore.pendingFocusRuleId = '__first__'
      return
    }

    let current: typeof rule | undefined = rule
    while (current !== undefined) {
      const parentId = current.parent_id
      if (parentId === null) break
      panelStore.expandedRuleIds.add(parentId)
      current = contentStore.rulesById.get(parentId)
    }

    const module = contentStore.activeModules.find((m) =>
      (contentStore.rulesByModule[m.id] ?? []).some((r) => r.id === rule.id),
    )
    if (module) {
      panelStore.expandedModuleIds.add(module.id)
    }

    await nextTick()
    panelStore.pendingFocusRuleId = rule.id
  },
)

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function selectRule(rule: Rule): void {
  router.push({ name: 'system-rule', params: { systemId: systemId.value, ruleId: rule.id } })
  panelStore.mobileOpen = false
}

function togglePin(): void {
  appSettings.sidebarPinned = !appSettings.sidebarPinned
  if (appSettings.sidebarPinned) {
    panelStore.mobileOpen = false
  }
}

function toggleModule(moduleId: string): void {
  if (panelStore.expandedModuleIds.has(moduleId)) {
    panelStore.expandedModuleIds.delete(moduleId)
  } else {
    panelStore.expandedModuleIds.add(moduleId)
  }
}

function buildTopLevelRules(rules: Rule[]): Rule[] {
  return rules.filter((r) => r.parent_id === null).sort((a, b) => a.sort_order - b.sort_order)
}

function getModuleRules(mod: Module): Rule[] {
  return contentStore.rulesByModule[mod.id] ?? []
}

useRuleDelegation(selectRule, () => contentStore.indexEntriesByTerm)
useInteractionStore().registerNavigate(
  selectRule,
  (number, opts) => contentStore.resolveRuleReference(number, opts),
  () => contentStore.indexEntriesByTerm,
  (fromRule, toRule) =>
    router.push({
      name: 'system-rule',
      params: { systemId: systemId.value, ruleId: fromRule.id },
      query: { to: toRule.id },
    }),
)

// ---------------------------------------------------------------------------
// Toolbar actions
//
// SOP and the Table Browser open as full-screen modals (Task 6); tools open
// in the full-screen tool modal (Task 5).
// ---------------------------------------------------------------------------

function openTableBrowser(): void {
  gameDataModalStore.openTableBrowser()
}

function openSop(): void {
  gameDataModalStore.openSop()
}

function openTool(toolId: string): void {
  toolModalStore.open(toolId)
}
</script>

<template>
  <div class="h-screen bg-background flex flex-col overflow-hidden">
    <!-- Header -->
    <SystemHeader
      :selected-rule="selectedRule"
      :get-module-rules="getModuleRules"
      :build-top-level-rules="buildTopLevelRules"
      @select="selectRule"
      @toggle-module="toggleModule"
      @toggle-pin="togglePin"
      @open-table-browser="openTableBrowser"
      @open-sop="openSop"
      @open-tool="openTool"
    />

    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center text-muted-foreground text-sm"
    >
      Loading…
    </div>

    <!-- Two-panel layout -->
    <div
      v-else
      class="flex-1 flex flex-col overflow-hidden"
      :style="{ height: 'calc(100vh - 53px)' }"
    >
      <div class="flex flex-1 overflow-hidden relative">
        <!-- Left panel -->
        <div
          :class="[
            'border-r border-border shrink-0 h-full flex-col relative',
            appSettings.sidebarPinned ? 'flex' : 'hidden md:flex',
          ]"
          :style="leftPanelStyle"
        >
          <LeftPanelContent
            :expanded-modules="panelStore.expandedModuleIds"
            :selected-rule="selectedRule"
            :pinned="appSettings.sidebarPinned"
            :get-module-rules="getModuleRules"
            :build-top-level-rules="buildTopLevelRules"
            @toggle-module="toggleModule"
            @select="selectRule"
            @toggle-pin="togglePin"
          />
          <!-- Left panel resize handle -->
          <div
            class="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-primary/30 transition-colors z-10"
            :class="leftDragging ? 'bg-primary/40' : ''"
            @pointerdown="onLeftDragStart"
          />
        </div>

        <!-- Main area -->
        <div class="flex-1 flex flex-col overflow-hidden relative">
          <!-- Rule content -->
          <div class="flex-1 overflow-hidden">
            <RouterView v-slot="{ Component }">
              <component :is="Component" v-if="Component" />

              <!-- Top-level TOC: shown when no child route is active -->
              <div v-else class="overflow-auto p-6 h-full">
                <div v-if="contentStore.releaseViewEmpty" class="text-muted-foreground text-sm">
                  No released version yet.
                </div>
                <template v-else>
                  <template v-if="contentStore.globalRuleNumbers">
                    <button
                      v-for="rule in contentStore.flatRootRules"
                      :key="rule.id"
                      class="w-full flex items-baseline gap-3 py-1 rounded-md hover:bg-muted/40 transition-colors text-left group"
                      @click="selectRule(rule)"
                    >
                      <span
                        class="font-mono text-sm text-primary font-semibold shrink-0 w-16 text-right"
                      >
                        {{ rule.number }}
                      </span>
                      <span
                        class="text-foreground/90 text-sm group-hover:text-foreground transition-colors flex-1 min-w-0"
                      >
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <span
                          :data-rule-context="rule.module_id"
                          v-html="renderContent(rule.title)"
                        />
                      </span>
                      <VersionStatusBadge :module-id="rule.module_id" show-details />
                    </button>
                  </template>
                  <template v-else>
                    <template v-for="mod in contentStore.activeModules" :key="mod.id">
                      <div v-if="buildTopLevelRules(getModuleRules(mod)).length > 0" class="mb-8">
                        <h2
                          class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3"
                        >
                          {{ mod.name }}
                        </h2>
                        <button
                          v-for="rule in buildTopLevelRules(getModuleRules(mod))"
                          :key="rule.id"
                          class="w-full flex items-baseline gap-3 py-1 rounded-md hover:bg-muted/40 transition-colors text-left group"
                          @click="selectRule(rule)"
                        >
                          <span
                            class="font-mono text-sm text-primary font-semibold shrink-0 w-16 text-right"
                          >
                            {{ rule.number }}
                          </span>
                          <span
                            class="text-foreground/90 text-sm group-hover:text-foreground transition-colors"
                          >
                            <!-- eslint-disable-next-line vue/no-v-html -->
                            <span
                              :data-rule-context="rule.module_id"
                              v-html="renderContent(rule.title)"
                            />
                          </span>
                        </button>
                      </div>
                    </template>
                  </template>
                </template>
              </div>
            </RouterView>
          </div>
        </div>

        <!-- Full-screen game-data modals (SOP + Table Browser) -->
        <SopModal />
        <TableBrowserModal />

        <!-- Full-screen tool modal (opened from Tools ▾) -->
        <ToolModal />
      </div>
    </div>
  </div>
</template>
