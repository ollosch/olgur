<script setup lang="ts">
import { ref, computed } from 'vue'
import { renderContent } from '@/lib/renderContent'
import { useTableHighlight } from '@/composables/useTableHighlight'

// ── Types ────────────────────────────────────────────────────────────────────

interface AttackType {
  id: string
  label: string
  markers?: string[]
}

interface OutcomeRow {
  id: string
  label: string
  markers?: string[]
}

interface DestructionCell {
  value: string
  hull?: string
  turret?: string
}

type CellValue = string | DestructionCell

interface DestructionTableData {
  title: string
  attack_types: AttackType[]
  outcome_rows: OutcomeRow[]
  cells: Record<string, Record<string, CellValue>>
  notes: string[]
}

interface DestructionTab {
  id: string
  label: string
  table: DestructionTableData
}

export interface DestructionContent {
  kind: 'destruction'
  title?: string
  tabs: DestructionTab[]
}

const props = defineProps<{ content: DestructionContent }>()

const { onCellEnter, onCellLeave, onCellClick, isRowActive, isColActive } =
  useTableHighlight()

const activeTabId = ref(props.content.tabs[0]?.id ?? '')

const activeTab = computed(
  () => props.content.tabs.find((tab) => tab.id === activeTabId.value) ?? props.content.tabs[0],
)

function selectTab(id: string): void {
  activeTabId.value = id
}

interface CellView {
  value: string
  hull?: string
  turret?: string
}

function cellView(cell: CellValue | undefined): CellView {
  if (cell === undefined) return { value: '' }
  if (typeof cell === 'string') return { value: cell }
  return { value: cell.value, hull: cell.hull, turret: cell.turret }
}
</script>

<template>
  <div class="overflow-x-auto">
    <!-- Tab switcher -->
    <div class="flex flex-wrap gap-1 mb-4" role="tablist">
      <button
        v-for="tab in props.content.tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :data-tab="tab.id"
        class="px-3 py-1.5 rounded text-xs font-medium transition-colors border"
        :class="
          tab.id === activeTabId
            ? 'bg-primary/20 border-primary text-foreground'
            : 'border-border text-muted-foreground hover:bg-muted/40'
        "
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <template v-if="activeTab">
      <h3
        class="text-base font-semibold text-foreground mb-4"
        data-test="destruction-title"
      >
        {{ activeTab.table.title }}
      </h3>

      <table class="text-xs border-collapse min-w-max font-mono">
        <thead>
          <tr>
            <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
              Final Effects DR
            </th>
            <th
              v-for="attack in activeTab.table.attack_types"
              :key="attack.id"
              class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
              :class="{ 'bg-primary/25': isColActive(attack.id) }"
            >
              {{ attack.label }}
              <sup
                v-if="attack.markers && attack.markers.length > 0"
                class="text-[9px] ml-0.5 text-primary"
              >
                {{ attack.markers.join('') }}
              </sup>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in activeTab.table.outcome_rows" :key="row.id">
            <th
              class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
              :class="{ 'bg-primary/25': isRowActive(row.id) }"
            >
              {{ row.label }}
              <sup
                v-if="row.markers && row.markers.length > 0"
                class="text-[9px] ml-0.5 text-primary"
              >
                {{ row.markers.join('') }}
              </sup>
            </th>
            <td
              v-for="attack in activeTab.table.attack_types"
              :key="attack.id"
              :data-row="row.id"
              :data-col="attack.id"
              class="border border-border px-2 py-1 text-center text-foreground"
              :class="{ 'bg-primary/15': isRowActive(row.id) || isColActive(attack.id) }"
              @mouseenter="onCellEnter(row.id, attack.id)"
              @mouseleave="onCellLeave()"
              @click="onCellClick(row.id, attack.id)"
            >
              <template
                v-for="view in [cellView(activeTab.table.cells[row.id]?.[attack.id])]"
                :key="view.value"
              >
                {{ view.value }}
                <sup v-if="view.hull" class="text-[9px] text-red-500 ml-0.5">{{ view.hull }}</sup>
                <sup v-if="view.turret" class="text-[9px] text-red-500 ml-0.5">
                  {{ view.turret }}
                </sup>
              </template>
            </td>
          </tr>
        </tbody>
      </table>

      <dl v-if="activeTab.table.notes.length > 0" class="mt-3 space-y-1">
        <div v-for="(note, i) in activeTab.table.notes" :key="i" class="flex gap-1.5 text-xs">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <dd class="text-muted-foreground" v-html="renderContent(note)" />
        </div>
      </dl>
    </template>
  </div>
</template>
