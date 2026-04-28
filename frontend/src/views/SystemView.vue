<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useContentStore } from '@/stores/content'
import { useHistoryStore } from '@/stores/history'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { useSystemStore } from '@/stores/system'
import { useRuleDelegation } from '@/composables/useRuleDelegation'
import { useRulePopup } from '@/composables/useRulePopup'
import type { Rule, Module, IndexEntry } from '@/types/domain'

import LeftPanelContent from '@/components/systems/LeftPanelContent.vue'
import SystemHeader from '@/components/systems/SystemHeader.vue'

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

  const activeModuleList = systemStore.modules.filter(
    (m) => m.is_core || (systemStore.membership?.config?.active_module_ids ?? []).includes(m.id),
  )

  await Promise.all([
    ...activeModuleList.map((m) => contentStore.fetchRules(m.id)),
    ...activeModuleList.map((m) => contentStore.fetchIndexEntries(m.id)),
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

const activeIds = computed((): string[] => systemStore.membership?.config?.active_module_ids ?? [])

const activeModules = computed((): Module[] =>
  systemStore.modules.filter((m) => m.is_core || activeIds.value.includes(m.id)),
)

const allRules = computed((): Rule[] =>
  activeModules.value.flatMap((m) => contentStore.rulesByModule[m.id] ?? []),
)

/** O(1) lookup by rule.id */
const rulesById = computed((): Map<string, Rule> => {
  const m = new Map<string, Rule>()
  for (const r of allRules.value) m.set(r.id, r)
  return m
})

/** O(1) lookup by rule.number — used by delegation hover/click */
const rulesByNumber = computed((): Map<string, Rule> => {
  const m = new Map<string, Rule>()
  for (const r of allRules.value) m.set(r.number, r)
  return m
})

/**
 * Pre-sorted children lookup: parent_id (or null for roots) → Rule[].
 * Passed to RuleDetailView via RouterView slot / provide, and to RuleTreeNode.
 */
const childrenMap = computed((): Map<string | null, Rule[]> => {
  const m = new Map<string | null, Rule[]>()
  for (const r of allRules.value) {
    const key = r.parent_id
    const bucket = m.get(key)
    if (bucket) {
      bucket.push(r)
    } else {
      m.set(key, [r])
    }
  }
  for (const bucket of m.values()) {
    bucket.sort((a, b) => a.sort_order - b.sort_order)
  }
  return m
})

const allIndexEntries = computed(() =>
  activeModules.value.flatMap((m) => contentStore.indexEntriesByModule[m.id] ?? []),
)

/** O(1) lookup by indexEntry.term — used by delegation hover */
const indexEntriesByTerm = computed(() => {
  const m = new Map<string, IndexEntry>()
  for (const e of allIndexEntries.value) m.set(e.term, e)
  return m
})

/**
 * The currently displayed rule (if any), derived from the active child route.
 * Used by the left panel tree for highlighting and by the history recorder.
 */
const selectedRule = computed((): Rule | null => {
  const ruleId = route.params['ruleId'] as string | undefined
  if (!ruleId) return null
  return rulesById.value.get(ruleId) ?? null
})

// ---------------------------------------------------------------------------
// Merge-load newly activated modules
//
// When the user activates an expansion from the home screen and then returns
// to an already-loaded system, the new module's content is missing.
// Watch activeIds and fetch any module whose content hasn't been loaded yet.
// ---------------------------------------------------------------------------

watch(
  activeIds,
  async (newIds) => {
    const modules = systemStore.modules
    const toLoad = modules.filter(
      (m) => !m.is_core && newIds.includes(m.id) && !contentStore.rulesByModule[m.id],
    )
    if (toLoad.length === 0) return
    await Promise.all([
      ...toLoad.map((m) => contentStore.fetchRules(m.id)),
      ...toLoad.map((m) => contentStore.fetchIndexEntries(m.id)),
    ])
    for (const m of toLoad) {
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
    const rule = rulesById.value.get(ruleId)
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
      current = rulesById.value.get(parentId)
    }

    const module = activeModules.value.find((m) =>
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

useRuleDelegation(() => rulesByNumber.value, selectRule, () => indexEntriesByTerm.value)
useRulePopup().registerNavigate(selectRule, () => rulesByNumber.value, () => indexEntriesByTerm.value)
</script>

<template>
  <div class="h-screen bg-background flex flex-col overflow-hidden">
    <!-- Header -->
    <SystemHeader
      :active-modules="activeModules"
      :all-index-entries="allIndexEntries"
      :rules-by-number="rulesByNumber"
      :children-map="childrenMap"
      :selected-rule="selectedRule"
      :get-module-rules="getModuleRules"
      :build-top-level-rules="buildTopLevelRules"
      @select="selectRule"
      @toggle-module="toggleModule"
      @toggle-pin="togglePin"
    />

    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center text-muted-foreground text-sm"
    >
      Loading…
    </div>

    <!-- Two-panel layout -->
    <div v-else class="flex-1 flex overflow-hidden" style="height: calc(100vh - 53px)">
      <!-- Left panel -->
      <div :class="['w-72 border-r border-border shrink-0 h-full flex-col', appSettings.sidebarPinned ? 'flex' : 'hidden md:flex']">
        <LeftPanelContent
          :active-modules="activeModules"
          :expanded-modules="panelStore.expandedModuleIds"
          :selected-rule="selectedRule"
          :all-index-entries="allIndexEntries"
          :rules-by-number="rulesByNumber"
          :children-map="childrenMap"
          :pinned="appSettings.sidebarPinned"
          :get-module-rules="getModuleRules"
          :build-top-level-rules="buildTopLevelRules"
          @toggle-module="toggleModule"
          @select="selectRule"
          @toggle-pin="togglePin"
        />
      </div>

      <!-- Right panel: child route content or top-level TOC -->
      <div class="flex-1 overflow-hidden">
        <RouterView v-slot="{ Component }">
          <component :is="Component" v-if="Component" />

          <!-- Top-level TOC: shown when no child route is active -->
          <div v-else class="overflow-auto p-6 h-full">
            <template v-for="mod in activeModules" :key="mod.id">
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
    </div>
  </div>
</template>
