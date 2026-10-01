<script setup lang="ts">
import { computed } from 'vue'
import { renderContent } from '@/lib/renderContent'
import { useTableHighlight } from '@/composables/useTableHighlight'
import AnnotationMarker from '@/components/game-data/AnnotationMarker.vue'

// ── Types ────────────────────────────────────────────────────────────────────

interface AttributeColumn {
  id: string
  label: string
  tags: string[]
}

interface AttributeCell {
  value: string
  markers?: string[]
}

interface AttributeRow {
  id: string
  label: string
  tags: string[]
  cells: Record<string, AttributeCell>
}

interface AttributeFootnote {
  text: string
  style?: 'white' | 'green' | 'yellow' | 'red' | 'grey'
}

export interface AttributeTableContent {
  kind: 'attribute_table'
  title?: string
  columns: AttributeColumn[]
  rows: AttributeRow[]
  footnotes?: Record<string, AttributeFootnote>
  visible_row_ids?: string[]
  visible_col_ids?: string[]
}

const props = defineProps<{
  content: AttributeTableContent
}>()

const { onCellEnter, onCellLeave, onCellClick, cellClasses, rowHeaderClasses, colHeaderClasses } =
  useTableHighlight()

// ── Visibility ────────────────────────────────────────────────────────────────

const visibleColumns = computed((): AttributeColumn[] => {
  const ids = props.content.visible_col_ids
  if (!ids) return props.content.columns
  return props.content.columns.filter((c) => c.tags.length === 0 || ids.includes(c.id))
})

const visibleRows = computed((): AttributeRow[] => {
  const ids = props.content.visible_row_ids
  if (!ids) return props.content.rows
  return props.content.rows.filter((r) => r.tags.length === 0 || ids.includes(r.id))
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const footnoteStyleClass: Record<string, string> = {
  white: 'text-foreground',
  green: 'text-green-300',
  yellow: 'text-yellow-200',
  red: 'text-red-300',
  grey: 'text-muted-foreground',
}

function footnoteClass(fn: AttributeFootnote): string {
  if (!fn.style) return 'text-foreground'
  return footnoteStyleClass[fn.style] ?? 'text-foreground'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="text-xs border-collapse min-w-max">
      <thead>
        <tr>
          <!-- Row label header -->
          <th class="border border-border px-2 py-1 text-left text-muted-foreground font-medium">
            Terrain
          </th>
          <th
            v-for="col in visibleColumns"
            :key="col.id"
            class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
            :class="colHeaderClasses(col.id)"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in visibleRows" :key="row.id" class="hover:bg-muted/20 transition-colors">
          <td
            class="border border-border px-2 py-1 font-medium text-foreground whitespace-nowrap"
            :class="rowHeaderClasses(row.id)"
          >
            {{ row.label }}
          </td>
          <td
            v-for="col in visibleColumns"
            :key="col.id"
            class="border border-border px-2 py-1 text-center font-mono text-foreground"
            :class="cellClasses(row.id, col.id)"
            @mouseenter="onCellEnter(row.id, col.id)"
            @mouseleave="onCellLeave()"
            @click="onCellClick(row.id, col.id)"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span v-html="renderContent(row.cells[col.id]?.value ?? '')" />
            <AnnotationMarker
              v-for="m in row.cells[col.id]?.markers ?? []"
              :key="m"
              :marker="m"
              :text="props.content.footnotes?.[m]?.text"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Footnotes -->
    <dl
      v-if="props.content.footnotes && Object.keys(props.content.footnotes).length > 0"
      class="mt-3 space-y-1"
    >
      <div v-for="(fn, key) in props.content.footnotes" :key="key" class="flex gap-1.5 text-xs">
        <dt class="font-semibold text-primary shrink-0">[{{ key }}]</dt>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <dd :class="footnoteClass(fn)" v-html="renderContent(fn.text)" />
      </div>
    </dl>
  </div>
</template>
