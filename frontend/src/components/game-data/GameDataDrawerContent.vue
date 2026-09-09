<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useGameDataPanelStore } from '@/stores/gameDataPanel'
import { SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Pin, PinOff } from '@lucide/vue'
import MatrixTable from '@/components/game-data/MatrixTable.vue'
import AttributeTable from '@/components/game-data/AttributeTable.vue'
import ModifierList from '@/components/game-data/ModifierList.vue'
import SopViewer from '@/components/game-data/SopViewer.vue'
import type { MatrixContent } from '@/components/game-data/MatrixTable.vue'
import type { AttributeTableContent } from '@/components/game-data/AttributeTable.vue'
import type { ModifierListContent } from '@/components/game-data/ModifierList.vue'
import type { SopContent } from '@/components/game-data/SopViewer.vue'
import type { GameDatum, Module } from '@/types/domain'

export type DrawerMode = 'tables' | 'sop'

type TableContent = MatrixContent | AttributeTableContent | ModifierListContent

const props = defineProps<{
  mode: DrawerMode
  isPinned: boolean
  isDragging: boolean
}>()

const emit = defineEmits<{
  'update:mode': [value: DrawerMode]
  'toggle-pin': []
  'drag-start': [event: PointerEvent]
}>()

const contentStore = useContentStore()
const systemStore = useSystemStore()
const membershipStore = useMembershipStore()

const tables = computed(() => contentStore.allGameData.filter((d) => d.type === 'table'))

// ── SOP provider selection ───────────────────────────────────────────────────
//
// SOPs are never merged. When several active modules provide an SOP the player
// chooses one provider; the choice persists in membership config as
// `selected_sop_module_id`. A single provider is used directly.

const sopModules = computed<Module[]>(() =>
  contentStore.activeModules.filter((m) =>
    (contentStore.gameDataByModule[m.id] ?? []).some((d) => d.type === 'sop'),
  ),
)

const selectedSopModuleId = computed(
  () => membershipStore.membership?.config?.selected_sop_module_id ?? null,
)

const resolvedSopModuleId = computed((): string | null => {
  if (sopModules.value.length === 1) {
    return sopModules.value[0]?.id ?? null
  }
  const selected = selectedSopModuleId.value
  if (selected && sopModules.value.some((m) => m.id === selected)) {
    return selected
  }
  return null
})

const sops = computed((): GameDatum[] => {
  const moduleId = resolvedSopModuleId.value
  if (!moduleId) return []
  return (contentStore.gameDataByModule[moduleId] ?? []).filter((d) => d.type === 'sop')
})

function selectSopModule(module: Module): void {
  const systemId = systemStore.currentSystem?.id
  if (!systemId) return
  void membershipStore.updateMembership(systemId, { selected_sop_module_id: module.id })
}

// Backed by a store (rather than local refs) so the active tab and each
// SOP's expand/collapse + search state survive the drawer's Sheet being
// closed and reopened.
const { activeTableId, activeSopId } = storeToRefs(useGameDataPanelStore())

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

function tableContent(item: GameDatum): TableContent | null {
  return item.content as unknown as TableContent
}

function sopContent(item: GameDatum): SopContent | null {
  return item.content as unknown as SopContent
}
</script>

<template>
  <!-- Left edge resize handle -->
  <div
    class="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-primary/30 transition-colors z-10"
    :class="isDragging ? 'bg-primary/40' : ''"
    @pointerdown="emit('drag-start', $event)"
  />

  <!-- Header -->
  <component
    :is="isPinned ? 'div' : SheetHeader"
    :class="
      isPinned
        ? 'shrink-0 border-b border-border px-4 flex-row items-center gap-0 h-[53px] flex'
        : 'shrink-0 border-b border-border px-4 py-0 flex-row items-center gap-0 space-y-0 h-[53px]'
    "
  >
    <!-- Mode tabs -->
    <div class="flex items-center gap-1">
      <button
        :class="[
          'px-3 h-[53px] text-xs font-medium border-b-2 transition-colors',
          props.mode === 'tables'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        ]"
        @click="emit('update:mode', 'tables')"
      >
        Tables
      </button>
      <button
        :class="[
          'px-3 h-[53px] text-xs font-medium border-b-2 transition-colors',
          props.mode === 'sop'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground',
        ]"
        @click="emit('update:mode', 'sop')"
      >
        SOP
      </button>
    </div>
    <div class="flex-1" />
    <!-- Pin/Unpin button -->
    <button
      class="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      :title="isPinned ? 'Unpin panel' : 'Pin panel'"
      @click="emit('toggle-pin')"
    >
      <PinOff v-if="isPinned" class="w-3.5 h-3.5" />
      <Pin v-else class="w-3.5 h-3.5" />
    </button>
    <SheetTitle v-if="!isPinned" class="sr-only"> Game Data </SheetTitle>
  </component>

  <!-- Tables pane -->
  <div v-if="props.mode === 'tables'" class="flex flex-col flex-1 overflow-hidden">
    <div
      v-if="tables.length === 0"
      class="flex-1 flex items-center justify-center text-sm text-muted-foreground"
    >
      No tables available.
    </div>
    <Tabs
      v-else
      :model-value="activeTable"
      class="flex flex-col flex-1 overflow-hidden"
      @update:model-value="
        (v) => {
          activeTableId = v as string
        }
      "
    >
      <TabsList
        class="shrink-0 w-full rounded-none border-b border-border justify-start px-2 gap-0.5 h-9 overflow-x-auto flex-nowrap"
      >
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
            :content="tableContent(table) as MatrixContent"
          />
          <AttributeTable
            v-else-if="tableContent(table)!.kind === 'attribute_table'"
            :content="tableContent(table) as AttributeTableContent"
          />
          <ModifierList
            v-else-if="tableContent(table)!.kind === 'modifier_list'"
            :content="tableContent(table) as ModifierListContent"
          />
        </template>
      </TabsContent>
    </Tabs>
  </div>

  <!-- SOP pane -->
  <div v-else-if="props.mode === 'sop'" class="flex flex-col flex-1 overflow-hidden">
    <!-- Provider selector (only when several active modules provide an SOP) -->
    <div v-if="sopModules.length > 1" class="shrink-0 border-b border-border px-3 py-2">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
        Choose SOP
      </p>
      <div class="flex flex-wrap gap-1">
        <button
          v-for="module in sopModules"
          :key="module.id"
          :class="[
            'px-2 py-1 rounded text-xs border transition-colors',
            module.id === resolvedSopModuleId
              ? 'bg-primary/15 text-primary border-primary/30'
              : 'border-border text-muted-foreground hover:text-foreground',
          ]"
          @click="selectSopModule(module)"
        >
          {{ module.name }}
        </button>
      </div>
    </div>

    <div
      v-if="sopModules.length === 0"
      class="flex-1 flex items-center justify-center text-sm text-muted-foreground"
    >
      No sequence of play data available.
    </div>
    <div
      v-else-if="sops.length === 0"
      class="flex-1 flex items-center justify-center text-sm text-muted-foreground"
    >
      Select an SOP to view.
    </div>
    <Tabs
      v-else
      :model-value="activeSop"
      class="flex flex-col flex-1 overflow-hidden"
      @update:model-value="
        (v) => {
          activeSopId = v as string
        }
      "
    >
      <TabsList
        class="shrink-0 w-full rounded-none border-b border-border justify-start px-2 gap-0.5 h-9 overflow-x-auto flex-nowrap"
      >
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
          :sop-id="sop.id"
          :content="sopContent(sop) as SopContent"
        />
      </TabsContent>
    </Tabs>
  </div>
</template>
