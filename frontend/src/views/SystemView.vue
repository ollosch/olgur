<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useContentStore } from '@/stores/content'
import { useHistoryStore } from '@/stores/history'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { useSystemStore } from '@/stores/system'
import { useRuleDelegation } from '@/composables/useRuleDelegation'
import { useRulePopup } from '@/composables/useRulePopup'
import type { Rule, Module } from '@/types/domain'

import LeftPanelContent from '@/components/systems/LeftPanelContent.vue'
import SystemHeader from '@/components/systems/SystemHeader.vue'
import GameDataDrawer from '@/components/game-data/GameDataDrawer.vue'
import BottomPanel from '@/components/layout/BottomPanel.vue'
import type { DrawerMode } from '@/components/game-data/GameDataDrawer.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const contentStore = useContentStore()
const appSettings = useAppSettingsStore()
const panelStore = useLeftPanelStore()
const historyStore = useHistoryStore()

const systemId = computed(() => route.params['systemId'] as string)
const loading = ref(true)

// ---------------------------------------------------------------------------
// Left panel resize
// ---------------------------------------------------------------------------

const LEFT_WIDTH_KEY = 'panel-left-width'
const LEFT_DEFAULT = 288
const LEFT_MIN = 200
const LEFT_MAX = 480

function loadLeftWidth(): number {
  const stored = localStorage.getItem(LEFT_WIDTH_KEY)
  if (!stored) return LEFT_DEFAULT
  const parsed = parseInt(stored, 10)
  return isNaN(parsed) ? LEFT_DEFAULT : parsed
}

const leftPanelWidth = ref(loadLeftWidth())

const leftPanelStyle = computed(() => ({
  width: `${leftPanelWidth.value}px`,
  minWidth: `${leftPanelWidth.value}px`,
}))

const leftDragging = ref(false)
let leftDragStartX = 0
let leftDragStartWidth = 0

function onLeftDragStart(e: PointerEvent): void {
  leftDragging.value = true
  leftDragStartX = e.clientX
  leftDragStartWidth = leftPanelWidth.value
  document.addEventListener('pointermove', onLeftDragMove)
  document.addEventListener('pointerup', onLeftDragEnd)
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'ew-resize'
}

function onLeftDragMove(e: PointerEvent): void {
  if (!leftDragging.value) return
  const delta = e.clientX - leftDragStartX
  leftPanelWidth.value = Math.max(LEFT_MIN, Math.min(leftDragStartWidth + delta, LEFT_MAX))
}

function onLeftDragEnd(): void {
  leftDragging.value = false
  localStorage.setItem(LEFT_WIDTH_KEY, String(leftPanelWidth.value))
  document.removeEventListener('pointermove', onLeftDragMove)
  document.removeEventListener('pointerup', onLeftDragEnd)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
}

onBeforeUnmount(() => {
  document.removeEventListener('pointermove', onLeftDragMove)
  document.removeEventListener('pointerup', onLeftDragEnd)
})

// ---------------------------------------------------------------------------
// System loading
//
// SystemView is mounted once per /systems/:systemId and stays mounted while
// navigating between child routes (rule/:ruleId, future table/:tableId, etc.).
// Re-enters the system only when systemId actually changes.
// ---------------------------------------------------------------------------

async function loadSystem(id: string): Promise<void> {
  if (systemStore.currentSystem?.id === id) {
    loading.value = false
    return
  }

  loading.value = true

  await systemStore.enterSystem(id)

  const activeModuleList = contentStore.activeModules

  await Promise.all([
    ...activeModuleList.map((m) => contentStore.fetchRules(m.id)),
    ...activeModuleList.map((m) => contentStore.fetchIndexEntries(m.id)),
    ...activeModuleList.map((m) => contentStore.fetchGameData(m.id)),
  ])

  for (const m of activeModuleList) {
    panelStore.expandedModuleIds.add(m.id)
  }

  loading.value = false
}

onMounted(() => loadSystem(systemId.value))

// Handle direct URL navigation between different systems
watch(systemId, (newId) => loadSystem(newId))

onUnmounted(() => {
  const id = systemStore.currentSystem?.id
  if (id) historyStore.clearSystem(id)
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
// Merge-load newly activated modules
//
// When the user activates an expansion from the home screen and then returns
// to an already-loaded system, the new module's content is missing.
// Watch activeIds and fetch any module whose content hasn't been loaded yet.
// ---------------------------------------------------------------------------

watch(
  () => contentStore.activeIds,
  async () => {
    const loaded = await contentStore.fetchMissingModules()
    for (const m of loaded) {
      panelStore.expandedModuleIds.add(m.id)
    }
  },
)

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
    historyStore.record({ type: 'rule', id: rule.id, systemId: id, title: rule.title, number: rule.number })
  },
)

// ---------------------------------------------------------------------------
// Tree tab focus: expand ancestors of selected rule when 't' shortcut fires
// ---------------------------------------------------------------------------

watch(
  () => panelStore.treeActivatedTick,
  async () => {
    const rule = selectedRule.value
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
  return rules
    .filter((r) => r.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order)
}

function getModuleRules(mod: Module): Rule[] {
  return contentStore.rulesByModule[mod.id] ?? []
}

useRuleDelegation(() => contentStore.rulesByNumber, selectRule, () => contentStore.indexEntriesByTerm)
useRulePopup().registerNavigate(
  selectRule,
  () => contentStore.rulesByNumber,
  () => contentStore.indexEntriesByTerm,
  (fromRule, toRule) => router.push({ name: 'system-rule', params: { systemId: systemId.value, ruleId: fromRule.id }, query: { to: toRule.id } }),
)

// ---------------------------------------------------------------------------
// Game data drawer
// ---------------------------------------------------------------------------

const drawerOpen = ref(false)
const drawerMode = ref<DrawerMode>('tables')

function openDrawer(mode: DrawerMode): void {
  drawerMode.value = mode
  drawerOpen.value = true
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
      @open-tables="openDrawer('tables')"
      @open-sop="openDrawer('sop')"
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
          :class="['border-r border-border shrink-0 h-full flex-col relative', appSettings.sidebarPinned ? 'flex' : 'hidden md:flex']"
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

        <!-- Main area (shrinks when bottom panel is pinned) -->
        <div class="flex-1 flex flex-col overflow-hidden relative">
          <!-- Rule content -->
          <div class="flex-1 overflow-hidden">
            <RouterView v-slot="{ Component }">
              <component :is="Component" v-if="Component" />

              <!-- Top-level TOC: shown when no child route is active -->
              <div v-else class="overflow-auto p-6 h-full">
                <template v-for="mod in contentStore.activeModules" :key="mod.id">
                  <div
                    v-if="buildTopLevelRules(getModuleRules(mod)).length > 0"
                    class="mb-8"
                  >
                    <h2 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                      {{ mod.name }}
                    </h2>
                    <button
                      v-for="rule in buildTopLevelRules(getModuleRules(mod))"
                      :key="rule.id"
                      class="w-full flex items-baseline gap-3 px-3 py-2.5 rounded-md hover:bg-muted/40 transition-colors text-left group"
                      @click="selectRule(rule)"
                    >
                      <span class="font-mono text-sm text-primary font-semibold shrink-0 w-16 text-right">
                        {{ rule.number }}
                      </span>
                      <span class="text-foreground/90 text-sm group-hover:text-foreground transition-colors">
                        {{ rule.title }}
                      </span>
                    </button>
                  </div>
                </template>
              </div>
            </RouterView>
          </div>

          <!-- Bottom panel -->
          <BottomPanel />
        </div>

        <!-- Right panel (pinned inline or sheet overlay) -->
        <GameDataDrawer
          v-model:open="drawerOpen"
          v-model:mode="drawerMode"
        />
      </div>
    </div>
  </div>
</template>
