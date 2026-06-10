<script setup lang="ts">
import { ref, computed } from 'vue'
import { useContentStore } from '@/stores/content'
import { useResizablePanel } from '@/composables/useResizablePanel'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Pin, PinOff } from 'lucide-vue-next'
import MatrixTable from '@/components/game-data/MatrixTable.vue'
import AttributeTable from '@/components/game-data/AttributeTable.vue'
import ModifierList from '@/components/game-data/ModifierList.vue'
import SopViewer from '@/components/game-data/SopViewer.vue'
import type { MatrixContent } from '@/components/game-data/MatrixTable.vue'
import type { AttributeTableContent } from '@/components/game-data/AttributeTable.vue'
import type { ModifierListContent } from '@/components/game-data/ModifierList.vue'
import type { SopContent } from '@/components/game-data/SopViewer.vue'
import type { GameDatum } from '@/types/domain'

export type DrawerMode = 'tables' | 'sop'

type TableContent = MatrixContent | AttributeTableContent | ModifierListContent

const props = defineProps<{
  open: boolean
  mode: DrawerMode
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:mode': [value: DrawerMode]
}>()

const contentStore = useContentStore()

// ── Pinning ────────────────────────────────────────────────────────────────────

const PIN_KEY = 'panel-right-pinned'

function loadPinned(): boolean {
  return localStorage.getItem(PIN_KEY) === 'true'
}

const isPinned = ref(loadPinned())

function togglePin(): void {
  isPinned.value = !isPinned.value
  localStorage.setItem(PIN_KEY, String(isPinned.value))
  if (isPinned.value) {
    emit('update:open', false)
  }
}

// ── Right panel resize ────────────────────────────────────────────────────────

const {
  size: drawerWidth,
  isDragging,
  startResize: onDragStart,
} = useResizablePanel({
  storageKey: 'panel-right-width',
  defaultSize: 600,
  min: 320,
  max: 1200,
  direction: 'horizontal',
  inverted: true,
})

const drawerStyle = computed(() => ({
  width: `min(90vw, ${drawerWidth.value}px)`,
  maxWidth: 'none',
}))

const pinnedStyle = computed(() => ({
  width: `${drawerWidth.value}px`,
  minWidth: `${drawerWidth.value}px`,
}))

// ── Data ──────────────────────────────────────────────────────────────────────

const tables = computed(() => contentStore.allGameData.filter((d) => d.type === 'table'))

const sops = computed(() => contentStore.allGameData.filter((d) => d.type === 'sop'))

// ── Active tab state per mode ─────────────────────────────────────────────────

const activeTableId = ref<string>('')
const activeSopId   = ref<string>('')

const activeTable = computed((): string => {
  if (activeTableId.value && tables.value.some((t) => t.id === activeTableId.value)) {
    return activeTableId.value
  }
  return tables.value[0]?.id ?? ''
})

const activeSop = computed((): string => {
  if (activeSopId.value && sops.value.some((s) => s.id === activeSopId.value)) {
    return activeSopId.value
  }
  return sops.value[0]?.id ?? ''
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function tableContent(item: GameDatum): TableContent | null {
  return (item.content as unknown) as TableContent
}

function sopContent(item: GameDatum): SopContent | null {
  return (item.content as unknown) as SopContent
}
</script>

<template>
  <!-- ── Pinned: inline static panel ───────────────────────────────────────── -->
  <div
    v-if="isPinned"
    class="shrink-0 h-full border-l border-border flex flex-col relative bg-background"
    :style="pinnedStyle"
  >
    <!-- Left edge resize handle -->
    <div
      class="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-primary/30 transition-colors z-10"
      :class="isDragging ? 'bg-primary/40' : ''"
      @pointerdown="onDragStart"
    />

    <!-- Header -->
    <div class="shrink-0 border-b border-border px-4 flex-row items-center gap-0 h-[53px] flex">
      <!-- Mode tabs -->
      <div class="flex items-center gap-1">
        <button
          :class="['px-3 h-[53px] text-xs font-medium border-b-2 transition-colors',
                   props.mode === 'tables'
                     ? 'border-primary text-foreground'
                     : 'border-transparent text-muted-foreground hover:text-foreground']"
          @click="emit('update:mode', 'tables')"
        >
          Tables
        </button>
        <button
          :class="['px-3 h-[53px] text-xs font-medium border-b-2 transition-colors',
                   props.mode === 'sop'
                     ? 'border-primary text-foreground'
                     : 'border-transparent text-muted-foreground hover:text-foreground']"
          @click="emit('update:mode', 'sop')"
        >
          SOP
        </button>
      </div>
      <div class="flex-1" />
      <!-- Pin button -->
      <button
        class="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Unpin panel"
        @click="togglePin"
      >
        <PinOff class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Tables pane -->
    <div v-if="props.mode === 'tables'" class="flex flex-col flex-1 overflow-hidden">
      <div v-if="tables.length === 0" class="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        No tables available.
      </div>
      <Tabs
        v-else
        :model-value="activeTable"
        class="flex flex-col flex-1 overflow-hidden"
        @update:model-value="(v) => { activeTableId = v as string }"
      >
        <TabsList class="shrink-0 w-full rounded-none border-b border-border justify-start px-2 gap-0.5 h-9 overflow-x-auto flex-nowrap">
          <TabsTrigger
            v-for="table in tables"
            :key="table.id"
            :value="table.id"
            class="text-xs px-3 h-7 whitespace-nowrap"
          >
            {{ table.name }}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          v-for="table in tables"
          :key="table.id"
          :value="table.id"
          class="flex-1 overflow-auto p-6 mt-0"
        >
          <template v-if="tableContent(table)">
            <MatrixTable
              v-if="tableContent(table)!.kind === 'matrix'"
              :content="(tableContent(table) as MatrixContent)"
            />
            <AttributeTable
              v-else-if="tableContent(table)!.kind === 'attribute_table'"
              :content="(tableContent(table) as AttributeTableContent)"
            />
            <ModifierList
              v-else-if="tableContent(table)!.kind === 'modifier_list'"
              :content="(tableContent(table) as ModifierListContent)"
            />
          </template>
        </TabsContent>
      </Tabs>
    </div>

    <!-- SOP pane -->
    <div v-else-if="props.mode === 'sop'" class="flex flex-col flex-1 overflow-hidden">
      <div v-if="sops.length === 0" class="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        No sequence of play data available.
      </div>
      <Tabs
        v-else
        :model-value="activeSop"
        class="flex flex-col flex-1 overflow-hidden"
        @update:model-value="(v) => { activeSopId = v as string }"
      >
        <TabsList class="shrink-0 w-full rounded-none border-b border-border justify-start px-2 gap-0.5 h-9 overflow-x-auto flex-nowrap">
          <TabsTrigger
            v-for="sop in sops"
            :key="sop.id"
            :value="sop.id"
            class="text-xs px-3 h-7 whitespace-nowrap"
          >
            {{ sop.name }}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          v-for="sop in sops"
          :key="sop.id"
          :value="sop.id"
          class="flex-1 overflow-auto p-6 mt-0"
        >
          <SopViewer
            v-if="sopContent(sop)"
            :content="(sopContent(sop) as SopContent)"
          />
        </TabsContent>
      </Tabs>
    </div>
  </div>

  <!-- ── Floating sheet (unpinned) ─────────────────────────────────────────── -->
  <Sheet
    v-else
    :open="props.open"
    @update:open="emit('update:open', $event)"
  >
    <SheetContent
      side="right"
      class="sm:max-w-none flex flex-col p-0 gap-0"
      :style="drawerStyle"
    >
      <!-- Left edge resize handle -->
      <div
        class="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-primary/30 transition-colors z-10"
        :class="isDragging ? 'bg-primary/40' : ''"
        @pointerdown="onDragStart"
      />

      <SheetHeader class="shrink-0 border-b border-border px-4 py-0 flex-row items-center gap-0 space-y-0 h-[53px]">
        <!-- Mode tabs: Tables / SOP -->
        <div class="flex items-center gap-1">
          <button
            :class="['px-3 h-[53px] text-xs font-medium border-b-2 transition-colors',
                     props.mode === 'tables'
                       ? 'border-primary text-foreground'
                       : 'border-transparent text-muted-foreground hover:text-foreground']"
            @click="emit('update:mode', 'tables')"
          >
            Tables
          </button>
          <button
            :class="['px-3 h-[53px] text-xs font-medium border-b-2 transition-colors',
                     props.mode === 'sop'
                       ? 'border-primary text-foreground'
                       : 'border-transparent text-muted-foreground hover:text-foreground']"
            @click="emit('update:mode', 'sop')"
          >
            SOP
          </button>
        </div>
        <div class="flex-1" />
        <!-- Pin button -->
        <button
          class="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Pin panel"
          @click="togglePin"
        >
          <Pin class="w-3.5 h-3.5" />
        </button>
        <SheetTitle class="sr-only">Game Data</SheetTitle>
      </SheetHeader>

      <!-- Tables pane -->
      <div v-if="props.mode === 'tables'" class="flex flex-col flex-1 overflow-hidden">
        <div v-if="tables.length === 0" class="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          No tables available.
        </div>
        <Tabs
          v-else
          :model-value="activeTable"
          class="flex flex-col flex-1 overflow-hidden"
          @update:model-value="(v) => { activeTableId = v as string }"
        >
          <TabsList class="shrink-0 w-full rounded-none border-b border-border justify-start px-2 gap-0.5 h-9 overflow-x-auto flex-nowrap">
            <TabsTrigger
              v-for="table in tables"
              :key="table.id"
              :value="table.id"
              class="text-xs px-3 h-7 whitespace-nowrap"
            >
              {{ table.name }}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            v-for="table in tables"
            :key="table.id"
            :value="table.id"
            class="flex-1 overflow-auto p-6 mt-0"
          >
            <template v-if="tableContent(table)">
              <MatrixTable
                v-if="tableContent(table)!.kind === 'matrix'"
                :content="(tableContent(table) as MatrixContent)"
              />
              <AttributeTable
                v-else-if="tableContent(table)!.kind === 'attribute_table'"
                :content="(tableContent(table) as AttributeTableContent)"
              />
              <ModifierList
                v-else-if="tableContent(table)!.kind === 'modifier_list'"
                :content="(tableContent(table) as ModifierListContent)"
              />
            </template>
          </TabsContent>
        </Tabs>
      </div>

      <!-- SOP pane -->
      <div v-else-if="props.mode === 'sop'" class="flex flex-col flex-1 overflow-hidden">
        <div v-if="sops.length === 0" class="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          No sequence of play data available.
        </div>
        <Tabs
          v-else
          :model-value="activeSop"
          class="flex flex-col flex-1 overflow-hidden"
          @update:model-value="(v) => { activeSopId = v as string }"
        >
          <TabsList class="shrink-0 w-full rounded-none border-b border-border justify-start px-2 gap-0.5 h-9 overflow-x-auto flex-nowrap">
            <TabsTrigger
              v-for="sop in sops"
              :key="sop.id"
              :value="sop.id"
              class="text-xs px-3 h-7 whitespace-nowrap"
            >
              {{ sop.name }}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            v-for="sop in sops"
            :key="sop.id"
            :value="sop.id"
            class="flex-1 overflow-auto p-6 mt-0"
          >
            <SopViewer
              v-if="sopContent(sop)"
              :content="(sopContent(sop) as SopContent)"
            />
          </TabsContent>
        </Tabs>
      </div>
    </SheetContent>
  </Sheet>
</template>
