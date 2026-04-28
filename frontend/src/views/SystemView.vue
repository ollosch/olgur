<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useAuthStore } from '@/stores/auth'
import { useBookmarkStore } from '@/stores/bookmarks'
import { useContentStore } from '@/stores/content'
import { useHistoryStore } from '@/stores/history'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { useShortcutStore } from '@/stores/shortcut'
import { useSystemStore } from '@/stores/system'
import { useRuleDelegation } from '@/composables/useRuleDelegation'
import { useRulePopup } from '@/composables/useRulePopup'
import type { Rule, Module, IndexEntry } from '@/types/domain'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Menu, MoreVertical, Search } from 'lucide-vue-next'
import LeftPanelContent from '@/components/systems/LeftPanelContent.vue'
import ManageMembersDialog from '@/components/systems/ManageMembersDialog.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const contentStore = useContentStore()
const authStore = useAuthStore()
const appSettings = useAppSettingsStore()
const panelStore = useLeftPanelStore()
const shortcutStore = useShortcutStore()
const historyStore = useHistoryStore()
const bookmarkStore = useBookmarkStore()

const systemId = computed(() => route.params['systemId'] as string)
const loading = ref(true)
const manageMembersOpen = ref(false)

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

async function logout(): Promise<void> {
  await authStore.logout()
  await router.push({ name: 'login' })
}

useRuleDelegation(() => rulesByNumber.value, selectRule, () => indexEntriesByTerm.value)
useRulePopup().registerNavigate(selectRule, () => rulesByNumber.value, () => indexEntriesByTerm.value)
</script>

<template>
  <div class="h-screen bg-background flex flex-col overflow-hidden">
    <!-- Header -->
    <header
      class="border-b border-border px-3 py-2 flex items-center gap-2 shrink-0 h-[53px]"
    >
      <!-- Left: mobile toggle + system name -->
      <div class="flex items-center gap-2 shrink-0">
        <Sheet v-model:open="panelStore.mobileOpen">
          <SheetTrigger as-child>
            <Button variant="ghost" size="icon" :class="['w-8 h-8', appSettings.sidebarPinned ? 'hidden' : 'md:hidden']">
              <Menu class="w-4 h-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" class="w-72 p-0 flex flex-col">
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
          </SheetContent>
        </Sheet>

        <span class="text-foreground font-semibold text-sm">
          {{ systemStore.currentSystem?.name }}
        </span>
      </div>

      <!-- Center: search trigger -->
      <div class="flex-1 flex justify-center">
        <Button
          variant="outline"
          class="h-8 w-full max-w-xs text-xs text-muted-foreground justify-start gap-2 px-3"
          @click="shortcutStore.overlayOpen = true"
        >
          <Search class="w-3.5 h-3.5 shrink-0" />
          <span>Search…</span>
          <kbd class="ml-auto text-[10px] text-muted-foreground/60 font-mono">⌘K</kbd>
        </Button>
      </div>

      <!-- Right: dropdown menu -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="w-8 h-8">
            <MoreVertical class="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48">
          <DropdownMenuItem @click="router.push({ name: 'home' })">
            Exit System
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            v-if="systemStore.membership?.admin"
            @click="manageMembersOpen = true"
          >
            Manage Members
          </DropdownMenuItem>
          <DropdownMenuSeparator v-if="systemStore.membership?.admin" />
          <DropdownMenuItem @click="router.push({ name: 'profile' })">
            User Profile
          </DropdownMenuItem>
          <DropdownMenuItem @click="router.push({ name: 'settings' })">
            App Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-destructive" @click="logout">
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

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

    <ManageMembersDialog
      v-if="systemStore.currentSystem"
      v-model:open="manageMembersOpen"
      :system-id="systemStore.currentSystem.id"
    />
  </div>
</template>
