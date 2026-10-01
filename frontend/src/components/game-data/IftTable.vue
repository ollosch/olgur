<script setup lang="ts">
import { computed } from 'vue'
import { renderContent } from '@/lib/renderContent'

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

export interface IftContent {
  kind: 'ift'
  title?: string
  columns: IftColumn[]
  rows: IftRow[]
  cells: Record<string, Record<string, string>>
  notes?: string[]
}

const props = defineProps<{ content: IftContent }>()

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
          >
            {{ row.label }}
          </th>
          <td
            v-for="col in props.content.columns"
            :key="col.id"
            class="border border-border px-2 py-1 text-center text-foreground"
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
  </div>
</template>
