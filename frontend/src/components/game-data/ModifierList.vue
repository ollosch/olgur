<script setup lang="ts">
import { computed } from 'vue'
import { renderContent } from '@/lib/renderContent'

// ── Types ────────────────────────────────────────────────────────────────────

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

export interface ModifierListContent {
  kind: 'modifier_list'
  title?: string
  columns: [string, string]
  entries: ModifierEntry[]
  footnotes?: Record<string, ModifierFootnote>
  active_tags?: string[]
}

const props = defineProps<{
  content: ModifierListContent
}>()

// ── Visibility ────────────────────────────────────────────────────────────────

const visibleEntries = computed((): ModifierEntry[] => {
  const activeTags = props.content.active_tags ?? []
  return props.content.entries.filter(
    (e) => e.tags.length === 0 || e.tags.some((t) => activeTags.includes(t)),
  )
})

// ── Helpers ──────────────────────────────────────────────────────────────────

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
    <table class="text-xs border-collapse min-w-max">
      <thead>
        <tr>
          <th class="border border-border px-3 py-1.5 text-left font-semibold text-foreground">
            {{ props.content.columns[0] }}
          </th>
          <th
            class="border border-border px-3 py-1.5 text-center font-semibold text-foreground w-16"
          >
            {{ props.content.columns[1] }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="entry in visibleEntries"
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
        <tr v-if="visibleEntries.length === 0">
          <td
            colspan="2"
            class="border border-border px-3 py-3 text-muted-foreground text-center italic"
          >
            No entries for current conditions.
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
