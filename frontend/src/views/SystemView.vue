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
import { useSystemNavStore } from '@/stores/systemNav'
import { useRuleDelegation } from '@/composables/useRuleDelegation'
import { useRulePopup } from '@/composables/useRulePopup'
import { renderContent } from '@/lib/renderContent'
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
import { Menu, MoreVertical, ArrowLeft, Star, Search } from 'lucide-vue-next'
import RuleDetailChildren from '@/components/systems/RuleDetailChildren.vue'
import RuleTocView from '@/components/systems/RuleTocView.vue'
import LeftPanelContent from '@/components/systems/LeftPanelContent.vue'
import ManageMembersDialog from '@/components/systems/ManageMembersDialog.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const contentStore = useContentStore()
const authStore = useAuthStore()
const navStore = useSystemNavStore()
const appSettings = useAppSettingsStore()
const panelStore = useLeftPanelStore()
const shortcutStore = useShortcutStore()
const historyStore = useHistoryStore()
const bookmarkStore = useBookmarkStore()

const systemId = computed(() => route.params['systemId'] as string)
const loading = ref(true)
const manageMembersOpen = ref(false)

// ---------------------------------------------------------------------------
// Popstate trap
//
// We push a sentinel browser-history entry on mount so the back button can
// never navigate the browser away from /systems/:systemId. Every time
// popstate fires we handle the navigation internally (moving the in-app
// history cursor) and immediately re-push the sentinel so the trap resets.
// The URL never changes while the user is inside a system.
// ---------------------------------------------------------------------------

function handlePopState(event: PopStateEvent): void {
  if (event.state !== null && typeof event.state === 'object' && 'forward' in event.state) {
    // Browser went forward (our sentinel was popped by a forward press)
    navStore.forward()
  } else {
    navStore.back()
  }
  // Re-arm the trap
  window.history.pushState({ sentinel: true }, '')
}

onMounted(async () => {
  // Push the sentinel before loading so any early back press is caught
  window.history.pushState({ sentinel: true }, '')
  window.addEventListener('popstate', handlePopState)

  // Skip fetching if this system is already loaded in the store.
  // Do NOT reset nav — the user may be returning from /profile or /settings.
  if (systemStore.currentSystem?.id === systemId.value) {
    loading.value = false
    return
  }

  // Entering a new system — reset nav history first
  navStore.reset()
  loading.value = true

  await systemStore.enterSystem(systemId.value)

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
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
  const systemId = systemStore.currentSystem?.id
  if (systemId) historyStore.clearSystem(systemId)
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

/** O(1) lookup by rule.id — used for parent traversal and nav store resolution */
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
 * Built once per allRules change; each RuleDetailChildren does O(1) get().
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

const tocDepth = computed(() => systemStore.currentSystem?.config?.toc_depth ?? 0)

/**
 * The currently displayed rule, derived from the nav store's current entry.
 * Null when no rule is selected or the entry is for a non-rule view.
 */
const selectedRule = computed((): Rule | null => {
  const entry = navStore.current
  if (entry === null || entry.view !== 'rule') return null
  return rulesById.value.get(entry.ruleId) ?? null
})

function ruleDepth(rule: Rule): number {
  let depth = 1
  let current: Rule = rule
  while (current.parent_id !== null) {
    const parent = rulesById.value.get(current.parent_id)
    if (!parent) break
    current = parent
    depth++
  }
  return depth
}

const showToc = computed(() => {
  if (!selectedRule.value) return false
  return ruleDepth(selectedRule.value) <= tocDepth.value
})

// ---------------------------------------------------------------------------
// History recording
// ---------------------------------------------------------------------------

watch(navStore, () => {
  const entry = navStore.current
  if (!entry || entry.view !== 'rule') return
  const rule = rulesById.value.get(entry.ruleId)
  const systemId = systemStore.currentSystem?.id
  if (!rule || !systemId) return
  historyStore.record({ type: 'rule', id: rule.id, systemId, title: rule.title, number: rule.number })
})

// ---------------------------------------------------------------------------
// Tree tab focus: expand ancestors of selected rule when 't' shortcut fires
// ---------------------------------------------------------------------------

watch(
  () => panelStore.treeActivatedTick,
  async () => {
    const rule = selectedRule.value
    if (!rule) {
      // No rule selected — focus first tree node (handled by LeftPanelContent)
      panelStore.pendingFocusRuleId = '__first__'
      return
    }

    // Expand all ancestor rule nodes up to the root
    let current: typeof rule | undefined = rule
    while (current !== undefined) {
      const parentId = current.parent_id
      if (parentId === null) break
      panelStore.expandedRuleIds.add(parentId)
      current = rulesById.value.get(parentId)
    }

    // Ensure the module containing the rule is expanded
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

function togglePin() {
  appSettings.sidebarPinned = !appSettings.sidebarPinned
  if (appSettings.sidebarPinned) {
    panelStore.mobileOpen = false
  }
}

function toggleModule(moduleId: string) {
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

function selectRule(rule: Rule) {
  navStore.navigate({ view: 'rule', ruleId: rule.id })
  panelStore.mobileOpen = false
}

async function logout() {
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
        <!-- Mobile panel toggle: hidden when panel is pinned -->
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
      <!-- Left panel: always visible when pinned, otherwise hidden on mobile -->
      <div :class="['w-72 border-r border-border shrink-0 h-full flex-col', appSettings.sidebarPinned ? 'flex' : 'hidden md:flex']">
        <LeftPanelContent
          :active-modules="activeModules"
          :expanded-modules="panelStore.expandedModuleIds"
          :selected-rule="selectedRule"
          :all-index-entries="allIndexEntries"
          :rules-by-number="rulesByNumber"
          :pinned="appSettings.sidebarPinned"
          :get-module-rules="getModuleRules"
          :build-top-level-rules="buildTopLevelRules"
          @toggle-module="toggleModule"
          @select="selectRule"
          @toggle-pin="togglePin"
        />
      </div>

      <!-- Right panel: Rule Detail -->
      <div class="flex-1 overflow-auto p-6">
        <div v-if="selectedRule">
          <div class="mb-4">
            <Button
              v-if="selectedRule"
              variant="ghost"
              size="sm"
              class="mb-3 -ml-2 h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              @click="navStore.canGoBack ? navStore.back() : navStore.reset()"
            >
              <ArrowLeft class="w-3.5 h-3.5" />
              Back
            </Button>
            <div class="flex items-baseline gap-3">
              <span class="text-primary font-mono text-lg font-bold">
                {{ selectedRule.number }}
              </span>
              <h2 class="text-foreground text-xl font-semibold">{{ selectedRule.title }}</h2>
              <button
                class="ml-auto shrink-0 p-1 rounded hover:bg-muted/40 transition-colors"
                :title="bookmarkStore.isBookmarked('rule', selectedRule.id) ? 'Remove bookmark' : 'Bookmark rule'"
                @click="bookmarkStore.isBookmarked('rule', selectedRule.id)
                  ? bookmarkStore.removeBookmark('rule', selectedRule.id)
                  : bookmarkStore.addBookmark('rule', selectedRule.id)"
              >
                <Star
                  class="w-4 h-4 transition-colors"
                  :class="bookmarkStore.isBookmarked('rule', selectedRule.id) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'"
                />
              </button>
            </div>
          </div>

          <!-- ToC view: depth <= toc_depth -->
          <RuleTocView
            v-if="showToc"
            :rule="selectedRule"
            :children-map="childrenMap"
            @select="selectRule"
          />

          <!-- Full content view: depth > toc_depth -->
          <template v-else>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p
              class="text-foreground/80 text-sm leading-relaxed mb-6 whitespace-pre-wrap"
              v-html="renderContent(selectedRule.content, { acronymPopups: appSettings.acronymPopups })"
            />

            <RuleDetailChildren
              :rule="selectedRule"
              :children-map="childrenMap"
              :depth="ruleDepth(selectedRule) - 1"
              :toc-depth="tocDepth"
              @select-rule="selectRule"
            />
          </template>
        </div>

        <!-- Top-level TOC when no rule is selected -->
        <div v-else>
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
      </div>
    </div>

    <ManageMembersDialog
      v-if="systemStore.currentSystem"
      v-model:open="manageMembersOpen"
      :system-id="systemStore.currentSystem.id"
    />
  </div>
</template>
