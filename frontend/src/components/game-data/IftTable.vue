<script setup lang="ts">
import { computed } from 'vue'
import { renderContent } from '@/lib/renderContent'
import { useTableHighlight } from '@/composables/useTableHighlight'

// ── Types ────────────────────────────────────────────────────────────────────

interface IftColumn {
  id: string
  fp: number
  fp_label: string
  col_dr: number | null
  col_dr_label?: string
  vehicle_dr: number | null
  annotations: string[]
  annotation_colspan?: number
}

interface IftRow {
  id: string
  label: string
  dr: number
}

interface ModifierEntry {
  label: string
  value: string
  tags: string[]
  markers: string[]
  effect_type?: 'drm' | 'fp_multiplier' | 'column_shift' | 'other'
  effect_value?: number | null
}

interface ModifierFootnote {
  text: string
  style?: string
}

export interface IftContent {
  kind: 'ift'
  title?: string
  columns: IftColumn[]
  rows: IftRow[]
  cells: Record<string, Record<string, string>>
  notes?: string[]
  modifiers?: ModifierEntry[]
  footnotes?: Record<string, ModifierFootnote>
}

const props = defineProps<{ content: IftContent }>()

const { onCellEnter, onCellLeave, onCellClick, isRowActive, isColActive } =
  useTableHighlight()

// ── Header layout ────────────────────────────────────────────────────────────

interface AnnotationCell {
  col: IftColumn
  text: string
  colspan: number
}

/** Annotation rows, each flattened into cells with colspans applied on the last row. */
const annotationRows = computed((): AnnotationCell[][] => {
  const cols = props.content.columns
  const rowCount = Math.max(0, ...cols.map((c) => c.annotations.length))
  const rows: AnnotationCell[][] = []

  for (let i = 0; i < rowCount; i++) {
    const cells: AnnotationCell[] = []
    let skip = 0

    for (const col of cols) {
      if (skip > 0) {
        skip--
        continue
      }
      const colspan = i === rowCount - 1 ? (col.annotation_colspan ?? 1) : 1
      skip = colspan - 1
      cells.push({ col, text: col.annotations[i] ?? '', colspan })
    }

    rows.push(cells)
  }

  return rows
})

function columnDrLabel(col: IftColumn): string {
  return col.col_dr_label ?? (col.col_dr !== null ? String(col.col_dr) : '')
}

// ── Footnote styling ─────────────────────────────────────────────────────────

const footnoteStyleClass: Record<string, string> = {
  white: 'text-foreground',
  green: 'text-green-300',
  yellow: 'text-yellow-200',
  red: 'text-red-300',
  grey: 'text-muted-foreground',
}

function footnoteClass(fn: ModifierFootnote): string {
  if (!fn.style) return 'text-foreground'
  return footnoteStyleClass[fn.style] ?? 'text-foreground'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="text-xs border-collapse min-w-max font-mono">
      <thead>
        <tr v-for="(row, i) in annotationRows" :key="`ann-${i}`">
          <th class="border border-border px-1 py-0.5 text-center text-muted-foreground" />
          <th
            v-for="cell in row"
            :key="cell.col.id"
            :colspan="cell.colspan"
            class="border border-border px-1 py-0.5 text-center text-muted-foreground whitespace-nowrap"
          >
            {{ cell.text }}
          </th>
        </tr>

        <tr>
          <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
            DR/FP
          </th>
          <th
            v-for="col in props.content.columns"
            :key="col.id"
            class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
            :class="{ 'bg-primary/25': isColActive(col.id) }"
          >
            {{ col.fp_label }}/{{ columnDrLabel(col) }}
          </th>
        </tr>

        <tr>
          <th class="border border-border px-2 py-1 text-center text-muted-foreground">
            ★Vehicle
          </th>
          <th
            v-for="col in props.content.columns"
            :key="col.id"
            class="border border-border px-2 py-1 text-center text-muted-foreground"
          >
            {{ col.vehicle_dr }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="row in props.content.rows" :key="row.id">
          <th
            class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
            :class="{ 'bg-primary/25': isRowActive(row.id) }"
          >
            {{ row.label }}
          </th>
          <td
            v-for="col in props.content.columns"
            :key="col.id"
            :data-row="row.id"
            :data-col="col.id"
            class="border border-border px-2 py-1 text-center text-foreground"
            :class="{ 'bg-primary/15': isRowActive(row.id) || isColActive(col.id) }"
            @mouseenter="onCellEnter(row.id, col.id)"
            @mouseleave="onCellLeave()"
            @click="onCellClick(row.id, col.id)"
          >
            {{ props.content.cells[row.id]?.[col.id] ?? '' }}
          </td>
        </tr>
      </tbody>
    </table>

    <dl
      v-if="props.content.notes && props.content.notes.length > 0"
      class="mt-3 space-y-1"
    >
      <div v-for="(note, i) in props.content.notes" :key="i" class="flex gap-1.5 text-xs">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <dd class="text-muted-foreground" v-html="renderContent(note)" />
      </div>
    </dl>

    <!-- FP/DR modifiers -->
    <section v-if="props.content.modifiers && props.content.modifiers.length > 0" class="mt-6">
      <h3 class="text-sm font-semibold text-foreground mb-2">FP or DR Modifiers</h3>
      <table class="text-xs border-collapse min-w-max">
        <thead>
          <tr>
            <th class="border border-border px-3 py-1.5 text-left font-semibold text-foreground">
              DRM / Cause
            </th>
            <th
              class="border border-border px-3 py-1.5 text-center font-semibold text-foreground w-16"
            >
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in props.content.modifiers"
            :key="entry.label"
            class="hover:bg-muted/20 transition-colors"
          >
            <td class="border border-border px-3 py-1.5 text-foreground">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="renderContent(entry.label)" />
              <sup v-if="entry.markers.length > 0" class="text-[9px] ml-0.5 text-primary">
                {{ entry.markers.join('') }}
              </sup>
            </td>
            <td
              class="border border-border px-3 py-1.5 text-center font-mono font-semibold text-foreground"
            >
              {{ entry.value }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Modifier footnotes -->
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
