<script setup lang="ts">
import { renderContent } from '@/lib/renderContent'

// ── Types ────────────────────────────────────────────────────────────────────

interface CctColumn {
  id: string
  odds: string
}

interface CctKillNumber {
  black: number
  red: number
}

export interface CctContent {
  kind: 'cct'
  title?: string
  columns: CctColumn[]
  kill_numbers: Record<string, CctKillNumber>
  notes?: string[]
}

const props = defineProps<{ content: CctContent }>()
</script>

<template>
  <div class="overflow-x-auto">
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
            class="border border-border px-2 py-1 text-center text-foreground"
          >
            {{ props.content.kill_numbers[col.id]?.black }}
            <span class="text-red-500">{{ props.content.kill_numbers[col.id]?.red }}</span>
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
