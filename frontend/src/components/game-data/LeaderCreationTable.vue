<script setup lang="ts">
import { renderContent } from '@/lib/renderContent'

// ── Types ────────────────────────────────────────────────────────────────────

interface LeaderCreationRow {
  id: string
  label: string
  leader: string
}

interface ModifierEntry {
  label: string
  value: string
  tags: string[]
  markers: string[]
  effect_type?: 'drm' | 'fp_multiplier' | 'column_shift' | 'other'
  effect_value?: number | null
}

export interface LeaderCreationContent {
  kind: 'leader_creation'
  title?: string
  note?: string
  rows: LeaderCreationRow[]
  modifiers?: ModifierEntry[]
}

const props = defineProps<{ content: LeaderCreationContent }>()
</script>

<template>
  <div class="overflow-x-auto">
    <p
      v-if="props.content.note"
      class="text-xs text-foreground mb-4"
      data-test="leader-creation-note"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span v-html="renderContent(props.content.note)" />
    </p>

    <table class="text-xs border-collapse min-w-max font-mono">
      <thead>
        <tr>
          <th class="border border-border px-3 py-1.5 text-left font-semibold text-foreground w-16">
            dr
          </th>
          <th class="border border-border px-3 py-1.5 text-left font-semibold text-foreground">
            Leader
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in props.content.rows"
          :key="row.id"
          class="hover:bg-muted/20 transition-colors"
        >
          <td
            class="border border-border px-3 py-1.5 text-foreground font-semibold"
            :data-roll="row.id"
          >
            {{ row.label }}
          </td>
          <td class="border border-border px-3 py-1.5 text-foreground">{{ row.leader }}</td>
        </tr>
      </tbody>
    </table>

    <!-- DRM -->
    <section v-if="props.content.modifiers && props.content.modifiers.length > 0" class="mt-6">
      <h3 class="text-sm font-semibold text-foreground mb-2">DRM</h3>
      <table class="text-xs border-collapse min-w-max">
        <thead>
          <tr>
            <th class="border border-border px-3 py-1.5 text-left font-semibold text-foreground">
              Cause
            </th>
            <th
              class="border border-border px-3 py-1.5 text-center font-semibold text-foreground w-16"
            >
              drm
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
  </div>
</template>
