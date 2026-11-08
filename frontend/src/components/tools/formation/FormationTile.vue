<script setup lang="ts">
import { computed } from 'vue'
import { Crosshair, ShieldCheck } from '@lucide/vue'
import StepBar from '@/components/tools/formation/StepBar.vue'
import { formationTotals, resolveSupportUnits } from '@/lib/formations'
import { useFormationManagerStore } from '@/stores/formationManager'
import type { Formation } from '@/types/formation'

const props = defineProps<{
  formation: Formation
  selected: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const store = useFormationManagerStore()
const totals = computed(() => formationTotals(props.formation))
const isSpent = computed(() => totals.value.steps === 0)
const unitSegments = computed(() =>
  props.formation.units.map((unit) => ({
    steps: unit.steps,
    startingSteps: unit.startingSteps,
  })),
)
const supportUnits = computed(() =>
  resolveSupportUnits(props.formation, store.current?.formations ?? []),
)
</script>

<template>
  <button
    type="button"
    class="flex h-full min-h-[72px] w-full flex-col justify-between gap-1 rounded border bg-gradient-to-b px-2.5 py-2 text-left shadow-sm transition-colors"
    :class="
      selected
        ? 'border-primary/70 from-primary/15 to-primary/5 ring-1 ring-primary/30'
        : formation.done
          ? 'border-transparent from-card/80 to-card/40 active:bg-muted/40'
          : isSpent
            ? 'border-red-500/40 from-card/80 to-card/40 active:bg-muted/40'
            : 'border-border/80 from-card/80 to-card/40 active:bg-muted/40'
    "
    :aria-pressed="selected"
    :title="formation.name"
    :data-formation-id="formation.id"
    @click="emit('select')"
  >
    <span class="line-clamp-2 text-[12px] font-semibold leading-tight text-foreground">
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

    <StepBar
      :steps="totals.steps"
      :starting-steps="totals.startingSteps"
      :segments="unitSegments"
      compact
    />

    <span class="flex min-h-3.5 flex-wrap items-center gap-1 overflow-hidden">
      <span
        class="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold"
        :class="
          formation.fatigue === 'fresh'
            ? 'bg-emerald-500/15 text-emerald-400'
            : 'bg-amber-500/15 text-amber-400'
        "
      >
        {{ formation.fatigue === 'fresh' ? 'Fresh' : `Fat ${formation.fatigue}` }}
      </span>
      <span
        v-if="formation.preparedDefense"
        class="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1 py-0.5 text-[9px] font-semibold text-primary"
      >
        <ShieldCheck class="h-2.5 w-2.5" />
        PD
      </span>
      <span
        v-if="formation.artilleryPoints > 0"
        class="inline-flex items-center gap-0.5 rounded bg-sky-500/15 px-1 py-0.5 text-[9px] font-semibold text-sky-400"
      >
        <Crosshair class="h-2.5 w-2.5" />
        {{ formation.artilleryPoints }}
      </span>
      <span
        v-if="formation.completeMsr"
        class="inline-flex items-center rounded bg-red-500/15 px-1 py-0.5 text-[9px] font-semibold text-red-400"
      >
        MSR
      </span>
      <span
        v-for="unit in supportUnits"
        :key="unit.name"
        class="flex w-full min-w-0 items-center gap-1 rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground"
      >
        <span class="truncate">{{ unit.name }}</span>
        <span v-if="unit.steps !== null" class="ml-auto w-10 shrink-0" data-support-dots>
          <StepBar :steps="unit.steps" :starting-steps="unit.startingSteps ?? unit.steps" compact />
        </span>
      </span>
    </span>
  </button>
</template>
