<script setup lang="ts">
import { computed } from 'vue'

export interface StepSegment {
  steps: number
  startingSteps: number
}

const props = withDefaults(
  defineProps<{
    steps: number
    startingSteps: number
    compact?: boolean
    segments?: StepSegment[]
  }>(),
  {
    compact: false,
    segments: undefined,
  },
)

const PIP_ROW_LIMIT = 30

const allPips = computed(() => {
  const segments =
    props.segments && props.segments.length > 0
      ? props.segments
      : [{ steps: props.steps, startingSteps: props.startingSteps }]

  return segments.flatMap((segment) =>
    Array.from({ length: Math.max(segment.steps, segment.startingSteps, 1) }, (_, index) =>
      pipClass(segment, index),
    ),
  )
})

const rows = computed(() => {
  const count = allPips.value.length
  const rowCount = Math.max(1, Math.ceil(count / PIP_ROW_LIMIT))
  const base = Math.floor(count / rowCount)
  const remainder = count % rowCount

  const rows: string[][] = []
  let index = 0
  for (let row = 0; row < rowCount; row++) {
    const length = base + (row < remainder ? 1 : 0)
    rows.push(allPips.value.slice(index, index + length))
    index += length
  }
  return rows
})

function pipClass(segment: StepSegment, index: number): string {
  if (segment.steps === 0) return 'bg-red-500/60'
  if (index >= segment.steps) return 'bg-muted-foreground/15'
  if (index >= segment.startingSteps) return 'bg-amber-400'
  if (segment.steps / Math.max(segment.startingSteps, 1) <= 0.25) return 'bg-red-500'
  if (segment.steps / Math.max(segment.startingSteps, 1) <= 0.5) return 'bg-amber-500'
  return 'bg-primary'
}
</script>

<template>
  <div
    class="flex w-full flex-col gap-[2px]"
    role="img"
    :aria-label="`${steps} of ${startingSteps} steps remaining`"
  >
    <div
      v-for="(row, rowIndex) in rows"
      :key="rowIndex"
      class="flex w-full items-stretch gap-[2px]"
      :class="compact ? 'h-1.5' : 'h-2.5'"
      data-step-row
    >
      <span
        v-for="(pip, pipIndex) in row"
        :key="pipIndex"
        class="min-w-[2px] flex-1 rounded-[1px] transition-colors"
        :class="pip"
      />
    </div>
  </div>
</template>
