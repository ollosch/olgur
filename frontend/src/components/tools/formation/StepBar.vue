<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    steps: number
    startingSteps: number
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const PIP_ROW_LIMIT = 30

const pipCount = computed(() => Math.max(props.steps, props.startingSteps, 1))

const rows = computed(() => {
  const count = pipCount.value
  const rowCount = Math.max(1, Math.ceil(count / PIP_ROW_LIMIT))
  const base = Math.floor(count / rowCount)
  const remainder = count % rowCount

  const rows: number[][] = []
  let index = 0
  for (let row = 0; row < rowCount; row++) {
    const length = base + (row < remainder ? 1 : 0)
    rows.push(Array.from({ length }, (_, offset) => index + offset))
    index += length
  }
  return rows
})

function pipClass(index: number): string {
  if (props.steps === 0) return 'bg-red-500/60'
  if (index >= props.steps) return 'bg-muted-foreground/15'
  if (index >= props.startingSteps) return 'bg-amber-400'
  if (props.steps / Math.max(props.startingSteps, 1) <= 0.25) return 'bg-red-500'
  if (props.steps / Math.max(props.startingSteps, 1) <= 0.5) return 'bg-amber-500'
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
        v-for="index in row"
        :key="index"
        class="min-w-[2px] flex-1 rounded-[1px] transition-colors"
        :class="pipClass(index)"
      />
    </div>
  </div>
</template>
