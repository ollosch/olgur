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

const pipCount = computed(() => Math.min(Math.max(props.steps, props.startingSteps, 1), 60))

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
    class="flex w-full items-stretch gap-[2px]"
    :class="compact ? 'h-1.5' : 'h-2.5'"
    role="img"
    :aria-label="`${steps} of ${startingSteps} steps remaining`"
  >
    <span
      v-for="index in pipCount"
      :key="index"
      class="min-w-[2px] flex-1 rounded-[1px] transition-colors"
      :class="pipClass(index - 1)"
    />
  </div>
</template>
