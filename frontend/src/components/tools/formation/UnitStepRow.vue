<script setup lang="ts">
import { computed } from 'vue'
import { Minus, Plus } from '@lucide/vue'
import StepBar from '@/components/tools/formation/StepBar.vue'
import { useFormationManagerStore } from '@/stores/formationManager'
import type { Formation, FormationUnit } from '@/types/formation'

const props = defineProps<{
  formation: Formation
  unit: FormationUnit
}>()

const store = useFormationManagerStore()

const lostSteps = computed(() => Math.max(0, props.unit.startingSteps - props.unit.steps))
const isDead = computed(() => props.unit.steps === 0)
</script>

<template>
  <div class="flex items-center gap-2 py-1">
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2">
        <span class="truncate text-xs font-medium text-foreground">{{ unit.name }}</span>
        <span
          v-if="isDead"
          class="shrink-0 rounded bg-red-500/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-400"
        >
          Dead
        </span>
        <span
          v-else-if="lostSteps > 0"
          class="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-red-400"
        >
          -{{ lostSteps }}
        </span>
      </div>
      <StepBar
        :steps="unit.steps"
        :starting-steps="unit.startingSteps"
        compact
        class="mt-1 max-w-32"
      />
    </div>

    <div class="flex shrink-0 items-center gap-1">
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded border border-border bg-secondary text-foreground transition-colors active:bg-muted disabled:opacity-40"
        :disabled="unit.steps <= 0"
        :aria-label="`Remove one step from ${unit.name}`"
        @click="store.adjustUnitSteps(formation.id, unit.id, -1)"
      >
        <Minus class="h-3.5 w-3.5" />
      </button>

      <div class="w-8 text-center text-sm font-bold tabular-nums leading-none text-foreground">
        {{ unit.steps }}
      </div>

      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded border border-border bg-secondary text-foreground transition-colors active:bg-muted"
        :aria-label="`Add one step to ${unit.name}`"
        @click="store.adjustUnitSteps(formation.id, unit.id, 1)"
      >
        <Plus class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
