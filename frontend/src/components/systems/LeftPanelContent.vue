<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Rule, Module } from '@/types/domain'
import { useLeftPanelStore, type PanelTab } from '@/stores/leftPanel'
import { useContentStore } from '@/stores/content'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, ChevronDown, Bookmark, History, Pin, PinOff } from '@lucide/vue'
import RuleTreeNode from '@/components/systems/RuleTreeNode.vue'
import IndexTab from '@/components/systems/IndexTab.vue'
import HistoryTab from '@/components/systems/HistoryTab.vue'
import BookmarksTab from '@/components/systems/BookmarksTab.vue'
import VersionStatusBadge from '@/components/versions/VersionStatusBadge.vue'

interface Props {
  expandedModules: Set<string>
  selectedRule: Rule | null
  pinned: boolean
  getModuleRules: (mod: Module) => Rule[]
  buildTopLevelRules: (rules: Rule[]) => Rule[]
}

defineProps<Props>()
const emit = defineEmits<{
  toggleModule: [moduleId: string]
  select: [rule: Rule]
  togglePin: []
}>()

const panelStore = useLeftPanelStore()
const contentStore = useContentStore()

// ---------------------------------------------------------------------------
// Tree container ref for focus/scroll queries
// ---------------------------------------------------------------------------

const treeContainerRef = ref<HTMLElement | null>(null)

function getTreeNodes(): HTMLElement[] {
  if (!treeContainerRef.value) return []
  return Array.from(treeContainerRef.value.querySelectorAll<HTMLElement>('button[data-tree-node]'))
}

// ---------------------------------------------------------------------------
// ↑ / ↓ keyboard navigation within the tree
// ---------------------------------------------------------------------------

function onTreeKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
  const nodes = getTreeNodes()
  if (nodes.length === 0) return
  const focused = document.activeElement as HTMLElement | null
  const idx = focused ? nodes.indexOf(focused) : -1
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    const target = idx > 0 ? nodes[idx - 1] : nodes[nodes.length - 1]
    target?.focus()
  } else {
    e.preventDefault()
    const target = idx < nodes.length - 1 ? nodes[idx + 1] : nodes[0]
    target?.focus()
  }
}

// ---------------------------------------------------------------------------
// Focus on pending request (set by SystemView after expanding ancestors)
// ---------------------------------------------------------------------------

watch(
  () => panelStore.pendingFocusRuleId,
  async (ruleId) => {
    if (ruleId === null) return
    // Clear immediately so repeated same-rule focus still triggers a re-watch
    panelStore.pendingFocusRuleId = null
    await nextTick()
    const nodes = getTreeNodes()
    if (nodes.length === 0) return
    if (ruleId === '__first__') {
      nodes[0]?.focus()
      return
    }
    const target = nodes.find((n) => n.dataset['ruleId'] === ruleId)
    if (target) {
      target.focus()
      target.scrollIntoView({ block: 'nearest' })
    }
  },
)
</script>

<template>
  <Tabs
    :model-value="panelStore.activeTab"
    class="flex flex-col h-full"
    @update:model-value="
      (v) => {
        panelStore.activeTab = v as PanelTab
      }
    "
  >
    <TabsList
      class="shrink-0 w-full rounded-none border-b border-border justify-start px-2 gap-1 h-9"
    >
      <TabsTrigger value="tree" class="text-xs px-3 h-7">Tree</TabsTrigger>
      <TabsTrigger value="index" class="text-xs px-3 h-7">Index</TabsTrigger>
      <TabsTrigger value="bookmarks" class="text-xs px-2 h-7">
        <Bookmark class="w-3 h-3" />
      </TabsTrigger>
      <TabsTrigger value="history" class="text-xs px-2 h-7">
        <History class="w-3 h-3" />
      </TabsTrigger>
      <!-- Pin button -->
      <button
        class="ml-auto shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-muted/50"
        :title="pinned ? 'Unpin panel' : 'Pin panel'"
        @click.stop="emit('togglePin')"
      >
        <PinOff v-if="pinned" class="w-3 h-3 text-primary" />
        <Pin v-else class="w-3 h-3 text-muted-foreground" />
      </button>
    </TabsList>

    <!-- Tree tab -->
    <TabsContent value="tree" class="flex-1 overflow-hidden mt-0">
      <ScrollArea class="h-full">
        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -->
        <div ref="treeContainerRef" class="py-4" data-tree-container @keydown="onTreeKeyDown">
          <!-- Flat tree for systems with globally unique rule numbers -->
          <template v-if="contentStore.globalRuleNumbers">
            <RuleTreeNode
              v-for="rule in contentStore.flatRootRules"
              :key="rule.id"
              :rule="rule"
              :children-map="contentStore.childrenMap"
              :selected-id="selectedRule?.id ?? null"
              :depth="1"
              @select="emit('select', $event)"
            />
          </template>

          <!-- Per-module tree otherwise -->
          <template v-else>
            <div v-for="mod in contentStore.activeModules" :key="mod.id" class="mb-2">
              <button
                class="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/30 transition-colors text-left"
                @click="emit('toggleModule', mod.id)"
              >
                <component
                  :is="expandedModules.has(mod.id) ? ChevronDown : ChevronRight"
                  class="w-3.5 h-3.5 text-muted-foreground shrink-0"
                />
                <span class="text-xs text-primary font-semibold uppercase tracking-wide">
                  {{ mod.name }}
                  <VersionStatusBadge :module-id="mod.id" />
                </span>
              </button>

              <div v-if="expandedModules.has(mod.id)">
                <RuleTreeNode
                  v-for="rule in buildTopLevelRules(getModuleRules(mod))"
                  :key="rule.id"
                  :rule="rule"
                  :children-map="contentStore.childrenMap"
                  :selected-id="selectedRule?.id ?? null"
                  :depth="1"
                  @select="emit('select', $event)"
                />
              </div>
            </div>
          </template>

          <div
            v-if="contentStore.activeModules.length === 0"
            class="px-4 text-xs text-muted-foreground"
          >
            No active modules.
          </div>
        </div>
      </ScrollArea>
    </TabsContent>

    <!-- Index tab -->
    <TabsContent value="index" class="flex-1 overflow-hidden mt-0">
      <IndexTab @select-rule="emit('select', $event)" />
    </TabsContent>

    <!-- Bookmarks tab -->
    <TabsContent value="bookmarks" class="flex-1 overflow-hidden mt-0">
      <BookmarksTab />
    </TabsContent>

    <!-- History tab -->
    <TabsContent value="history" class="flex-1 overflow-hidden mt-0">
      <HistoryTab />
    </TabsContent>
  </Tabs>
</template>
