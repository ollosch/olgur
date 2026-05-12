<script setup lang="ts">
import { renderContent } from '@/lib/renderContent'

// ── Types ────────────────────────────────────────────────────────────────────

interface MatrixColumn {
  id: string
  label: string
  annotations: string[]
}

interface MatrixRow {
  id: string
  label: string
}

interface MatrixCell {
  value: string
  style?: 'white' | 'green' | 'yellow' | 'red' | 'grey'
  markers?: string[]
}

interface MatrixFootnote {
  text: string
  style?: 'white' | 'green' | 'yellow' | 'red' | 'grey'
}

export interface MatrixContent {
  kind: 'matrix'
  title?: string
  row_header?: string
  col_header?: string
  columns: MatrixColumn[]
  rows: MatrixRow[]
  cells: Record<string, Record<string, MatrixCell>>
  footnotes?: Record<string, MatrixFootnote>
}

const props = defineProps<{ content: MatrixContent }>()

// ── Helpers ──────────────────────────────────────────────────────────────────

const cellStyleClass: Record<string, string> = {
  white: 'bg-background',
  green: 'bg-green-900/40 text-green-300',
  yellow: 'bg-yellow-900/40 text-yellow-200',
  red: 'bg-red-900/50 text-red-300',
  grey: 'bg-muted/60 text-muted-foreground',
}

const footnoteStyleClass: Record<string, string> = {
  white: 'text-foreground',
  green: 'text-green-300',
  yellow: 'text-yellow-200',
  red: 'text-red-300',
  grey: 'text-muted-foreground',
}

function cellClass(cell: MatrixCell | undefined): string {
  if (!cell?.style) return 'bg-background'
  return cellStyleClass[cell.style] ?? 'bg-background'
}

function footnoteClass(fn: MatrixFootnote): string {
  if (!fn.style) return 'text-foreground'
  return footnoteStyleClass[fn.style] ?? 'text-foreground'
}

/** Max annotation rows across all columns */
function maxAnnotationRows(columns: MatrixColumn[]): number {
  return Math.max(0, ...columns.map((c) => c.annotations.length))
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="text-xs border-collapse min-w-max font-mono">
      <!-- Annotation rows (weapon names above FP numbers) -->
      <template v-if="maxAnnotationRows(props.content.columns) > 0">
        <thead>
          <!-- One row per annotation slot -->
          <tr
            v-for="i in maxAnnotationRows(props.content.columns)"
            :key="`ann-${i}`"
          >
            <!-- row-header cell -->
            <th
              v-if="i === 1"
              :rowspan="maxAnnotationRows(props.content.columns)"
              class="border border-border px-2 py-1 text-center text-muted-foreground align-bottom"
            >
              {{ props.content.row_header ?? '' }}
            </th>
            <!-- empty spacer if not first annotation row but no rowspan slot -->
            <th
              v-else-if="false"
              class="border border-border"
            />

            <!-- annotation cell per column -->
            <th
              v-for="col in props.content.columns"
              :key="`ann-${i}-${col.id}`"
              class="border border-border px-1 py-0.5 text-center text-muted-foreground whitespace-nowrap"
            >
              {{ col.annotations[i - 1] ?? '' }}
            </th>
          </tr>

          <!-- Column header row (FP numbers) -->
          <tr>
            <!-- row_header already spanned above — skip if annotation rows exist -->
            <th
              v-if="maxAnnotationRows(props.content.columns) === 0"
              class="border border-border px-2 py-1 text-center text-muted-foreground"
            >
              {{ props.content.row_header ?? '' }}
            </th>
            <th
              v-for="col in props.content.columns"
              :key="col.id"
              class="border border-border px-2 py-1 text-center font-semibold text-foreground"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
      </template>

      <template v-else>
        <thead>
          <tr>
            <th class="border border-border px-2 py-1 text-center text-muted-foreground">
              {{ props.content.row_header ?? '' }}
            </th>
            <th
              v-for="col in props.content.columns"
              :key="col.id"
              class="border border-border px-2 py-1 text-center font-semibold text-foreground"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
      </template>

      <tbody>
        <tr v-for="row in props.content.rows" :key="row.id">
          <!-- Row label -->
          <th class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap">
            {{ row.label }}
          </th>
          <!-- Cells -->
          <td
            v-for="col in props.content.columns"
            :key="col.id"
            :class="['border border-border px-2 py-1 text-center relative', cellClass(props.content.cells[row.id]?.[col.id])]"
          >
            {{ props.content.cells[row.id]?.[col.id]?.value ?? '' }}
            <!-- Markers -->
            <sup
              v-if="(props.content.cells[row.id]?.[col.id]?.markers ?? []).length > 0"
              class="text-[9px] ml-0.5 text-primary"
            >
              {{ (props.content.cells[row.id]?.[col.id]?.markers ?? []).join('') }}
            </sup>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Footnotes -->
    <dl
      v-if="props.content.footnotes && Object.keys(props.content.footnotes).length > 0"
      class="mt-3 space-y-1"
    >
      <div
        v-for="(fn, key) in props.content.footnotes"
        :key="key"
        class="flex gap-1.5 text-xs"
      >
        <dt class="font-semibold text-primary shrink-0">[{{ key }}]</dt>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <dd :class="footnoteClass(fn)" v-html="renderContent(fn.text)" />
      </div>
    </dl>
  </div>
</template>
