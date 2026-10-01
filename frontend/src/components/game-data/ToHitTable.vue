<script setup lang="ts">
// ── Types ────────────────────────────────────────────────────────────────────

interface RangeBand {
  id: string
  label: string
  min: number
  max: number | null
}

interface TargetType {
  id: string
  label: string
}

interface ToHitValue {
  black: number | null
  red: number | null
}

export interface ToHitContent {
  kind: 'to_hit'
  title?: string
  range_bands: RangeBand[]
  target_types: TargetType[]
  values: Record<string, Record<string, ToHitValue>>
}

const props = defineProps<{ content: ToHitContent }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="text-xs border-collapse min-w-max font-mono">
      <thead>
        <tr>
          <th
            rowspan="2"
            class="border border-border px-2 py-1 text-center font-semibold text-foreground"
          >
            Target Type
          </th>
          <th
            v-for="band in props.content.range_bands"
            :key="band.id"
            colspan="2"
            class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
          >
            {{ band.label }}
          </th>
        </tr>
        <tr>
          <template v-for="band in props.content.range_bands" :key="`sub-${band.id}`">
            <th class="border border-border px-1 py-0.5 text-center text-muted-foreground">
              black
            </th>
            <th class="border border-border px-1 py-0.5 text-center text-red-500">red</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-for="type in props.content.target_types" :key="type.id">
          <th
            class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
          >
            {{ type.label }}
          </th>
          <template v-for="band in props.content.range_bands" :key="band.id">
            <td class="border border-border px-2 py-1 text-center text-foreground">
              {{ props.content.values[type.id]?.[band.id]?.black }}
            </td>
            <td class="border border-border px-2 py-1 text-center text-red-500">
              {{ props.content.values[type.id]?.[band.id]?.red }}
            </td>
          </template>
        </tr>
      </tbody>
    </table>
  </div>
</template>
