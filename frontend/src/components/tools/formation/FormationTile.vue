<script setup lang="ts">
import { computed } from 'vue'
import { Crosshair, ShieldCheck } from '@lucide/vue'
import StepBar from '@/components/tools/formation/StepBar.vue'
import { formationTotals } from '@/lib/formations'
import type { Formation } from '@/types/formation'

const props = defineProps<{
  formation: Formation
  selected: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const totals = computed(() => formationTotals(props.formation))
const isSpent = computed(() => totals.value.steps === 0)
</script>

<template>
  <button
    type="button"
    class="flex h-full min-h-[76px] w-full flex-col justify-between gap-1 rounded-lg border px-2.5 py-2 text-left transition-colors"
    :class="
      selected
        ? 'border-primary/70 bg-primary/10'
        : isSpent
          ? 'border-red-500/40 bg-card/70 active:bg-muted/40'
          : 'border-border/80 bg-card/70 active:bg-muted/40'
    "
    :aria-pressed="selected"
    :title="formation.name"
    :data-formation-id="formation.id"
    @click="emit('select')"
  >
    <span class="line-clamp-2 text-[13px] font-semibold leading-tight text-foreground">
      {{ formation.name }}
    </span>

    <span class="flex items-center justify-between gap-2">
      <span class="text-xs font-bold tabular-nums text-foreground">
        {{ totals.steps }}
        <span class="font-normal text-muted-foreground">/ {{ totals.startingSteps }}</span>
      </span>
      <span
        v-if="isSpent"
        class="shrink-0 rounded bg-red-500/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-400"
      >
        No steps
      </span>
    </span>

    <StepBar :steps="totals.steps" :starting-steps="totals.startingSteps" compact />

    <span class="flex min-h-3.5 flex-wrap items-center gap-1 overflow-hidden">
      <span
        v-if="formation.preparedDefense"
        class="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1 py-0.5 text-[9px] font-semibold text-primary"
      >
        <ShieldCheck class="h-2.5 w-2.5" />
        Prep
      </span>
      <span
        v-if="formation.fatigue !== 'fresh'"
        class="inline-flex items-center rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-semibold text-amber-400"
      >
        Fat {{ formation.fatigue }}
      </span>
      <span
        v-if="formation.artilleryPoints > 0"
        class="inline-flex items-center gap-0.5 rounded bg-sky-500/15 px-1 py-0.5 text-[9px] font-semibold text-sky-400"
      >
        <Crosshair class="h-2.5 w-2.5" />
        {{ formation.artilleryPoints }}
      </span>
      <span
        v-if="formation.support.trim() !== ''"
        class="max-w-full truncate rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
      >
        {{ formation.support }}
      </span>
    </span>
  </button>
</template>
