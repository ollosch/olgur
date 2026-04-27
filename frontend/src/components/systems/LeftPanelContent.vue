<script setup lang="ts">
import type { Module, Rule, IndexEntry } from '@/types/domain'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

    <!-- Treetab -->
    <TabsContent value="tree" class="flex-1 overflow-hidden mt-0">
      <div class="flex items-center justify-center h-full text-xs text-muted-foreground">
        Tree coming soon.
      </div>
    </TabsContent>

    <!-- Index tab -->
    <TabsContent value="index" class="flex-1 overflow-hidden mt-0">
      <div class="flex items-center justify-center h-full text-xs text-muted-foreground">
        Index coming soon.
      </div>
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
