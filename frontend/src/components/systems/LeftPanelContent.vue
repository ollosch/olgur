<script setup lang="ts">
import type { Module, Rule, IndexEntry } from '@/types/domain'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronRight, ChevronDown, Bookmark, History, Pin, PinOff } from 'lucide-vue-next'
import RuleTreeNode from '@/components/systems/RuleTreeNode.vue'
import IndexTab from '@/components/systems/IndexTab.vue'

interface Props {
  activeModules: Module[]
  expandedModules: Set<string>
  selectedRule: Rule | null
  allIndexEntries: IndexEntry[]
  rulesByNumber: Map<string, Rule>
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
</script>

<template>
  <Tabs default-value="tree" class="flex flex-col h-full">
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
        class="ml-auto w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-muted/50"
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
        <div class="py-4">
          <div v-for="mod in activeModules" :key="mod.id" class="mb-2">
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
              </span>
            </button>

            <div v-if="expandedModules.has(mod.id)">
              <RuleTreeNode
                v-for="rule in buildTopLevelRules(getModuleRules(mod))"
                :key="rule.id"
                :rule="rule"
                :all-rules="getModuleRules(mod)"
                :selected-id="selectedRule?.id ?? null"
                :depth="1"
                @select="emit('select', $event)"
              />
            </div>
          </div>

          <div v-if="activeModules.length === 0" class="px-4 text-xs text-muted-foreground">
            No active modules.
          </div>
        </div>
      </ScrollArea>
    </TabsContent>

    <!-- Index tab -->
    <TabsContent value="index" class="flex-1 overflow-hidden mt-0">
      <IndexTab
        :entries="allIndexEntries"
        :rules-by-number="rulesByNumber"
        @select-rule="emit('select', $event)"
      />
    </TabsContent>

    <!-- Bookmarks tab (stub) -->
    <TabsContent value="bookmarks" class="flex-1 overflow-hidden mt-0">
      <div class="flex items-center justify-center h-full text-xs text-muted-foreground">
        Bookmarks coming soon.
      </div>
    </TabsContent>

    <!-- History tab (stub) -->
    <TabsContent value="history" class="flex-1 overflow-hidden mt-0">
      <div class="flex items-center justify-center h-full text-xs text-muted-foreground">
        History coming soon.
      </div>
    </TabsContent>
  </Tabs>
</template>
