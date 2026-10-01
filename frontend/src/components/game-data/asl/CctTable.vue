<script setup lang="ts">
import { renderContent } from '@/lib/renderContent'
import { useTableHighlight } from '@/composables/useTableHighlight'
import AnnotationMarker from '@/components/game-data/AnnotationMarker.vue'

// ── Types ────────────────────────────────────────────────────────────────────

interface CctColumn {
  id: string
  odds: string
}

interface CctKillNumber {
  black: number
  red: number
}

interface ModifierEntry {
  label: string
  value: string
  tags: string[]
  markers: string[]
  effect_type?: 'drm' | 'fp_multiplier' | 'column_shift' | 'other'
  effect_value?: number | null
}

export interface CctContent {
  kind: 'cct'
  title?: string
  columns: CctColumn[]
  kill_numbers: Record<string, CctKillNumber>
  notes?: string[]
  modifiers?: ModifierEntry[]
}

const props = defineProps<{ content: CctContent }>()

const { onCellEnter, onCellLeave, onCellClick, cellClasses, colHeaderClasses } =
  useTableHighlight()

const killRowId = 'kill'
</script>

<template>
  <div class="overflow-x-auto max-w-full">
    <table class="text-xs border-collapse min-w-max font-mono">
      <thead>
        <tr>
          <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
            Odds Ratio
          </th>
          <th
            v-for="col in props.content.columns"
            :key="col.id"
            class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
            :class="colHeaderClasses(col.id)"
          >
            {{ col.odds }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
            Kill Number
          </th>
          <td
            v-for="col in props.content.columns"
            :key="col.id"
            :data-col="col.id"
            class="border border-border px-2 py-1 text-center text-foreground"
            :class="cellClasses(killRowId, col.id)"
            @mouseenter="onCellEnter(killRowId, col.id)"
            @mouseleave="onCellLeave()"
            @click="onCellClick(killRowId, col.id)"
          >
            {{ props.content.kill_numbers[col.id]?.black }}
            <span class="text-red-500">{{ props.content.kill_numbers[col.id]?.red }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- CC / Firepower DRM -->
    <section v-if="props.content.modifiers && props.content.modifiers.length > 0" class="mt-6">
      <h3 class="text-sm font-semibold text-foreground mb-2">CC / Firepower DRM</h3>
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
              <AnnotationMarker v-for="m in entry.markers" :key="m" :marker="m" />
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
