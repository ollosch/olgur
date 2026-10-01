<script setup lang="ts">
import { ref, computed } from 'vue'
import { renderContent } from '@/lib/renderContent'
import { useTableHighlight } from '@/composables/useTableHighlight'
import AnnotationMarker from '@/components/game-data/AnnotationMarker.vue'

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

const { onCellEnter, onCellLeave, onCellClick, cellClasses, rowHeaderClasses, colHeaderClasses } =
  useTableHighlight()

const activeTabId = ref(props.content.tabs[0]?.id ?? '')

const activeTab = computed(
  () => props.content.tabs.find((tab) => tab.id === activeTabId.value) ?? props.content.tabs[0],
)

function selectTab(id: string): void {
  activeTabId.value = id
}

/**
 * Marker → note text lookup for the active tab. Each `notes[]` line's prefix
 * before the first `:` is split on `/` so `H/T: …` maps both `H` and `T` to the
 * same text.
 */
const noteByMarker = computed(() => {
  const map = new Map<string, string>()
  for (const note of activeTab.value?.table.notes ?? []) {
    const prefix = note.split(':', 1)[0] ?? ''
    for (const key of prefix.split('/')) {
      if (key) map.set(key, note)
    }
  }
  return map
})

function noteText(marker: string): string | undefined {
  return noteByMarker.value.get(marker)
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
  <div class="overflow-x-auto max-w-full">
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
              :class="colHeaderClasses(attack.id)"
            >
              {{ attack.label }}
              <AnnotationMarker
                v-for="m in attack.markers ?? []"
                :key="m"
                :marker="m"
                :text="noteText(m)"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in activeTab.table.outcome_rows" :key="row.id">
            <th
              class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
              :class="rowHeaderClasses(row.id)"
            >
              {{ row.label }}
              <AnnotationMarker
                v-for="m in row.markers ?? []"
                :key="m"
                :marker="m"
                :text="noteText(m)"
              />
            </th>
            <td
              v-for="attack in activeTab.table.attack_types"
              :key="attack.id"
              :data-row="row.id"
              :data-col="attack.id"
              class="border border-border px-2 py-1 text-center text-foreground"
              :class="cellClasses(row.id, attack.id)"
              @mouseenter="onCellEnter(row.id, attack.id)"
              @mouseleave="onCellLeave()"
              @click="onCellClick(row.id, attack.id)"
            >
              <template
                v-for="view in [cellView(activeTab.table.cells[row.id]?.[attack.id])]"
                :key="view.value"
              >
                {{ view.value }}
                <AnnotationMarker v-if="view.hull" :marker="view.hull" :text="noteText(view.hull)" />
                <AnnotationMarker
                  v-if="view.turret"
                  :marker="view.turret"
                  :text="noteText(view.turret)"
                />
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
