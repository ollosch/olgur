<script setup lang="ts">
import { computed } from 'vue'
import {
  Crosshair,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Skull,
  X,
} from '@lucide/vue'
import { Input } from '@/components/ui/input'
import UnitStepRow from '@/components/tools/formation/UnitStepRow.vue'
import { useFormationManagerStore } from '@/stores/formationManager'
import {
  FATIGUE_LEVELS,
  fatigueLabel,
  STATUS_LABELS,
  type FatigueLevel,
  type Formation,
} from '@/types/formation'

const props = defineProps<{
  formation: Formation
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useFormationManagerStore()
const totals = computed(() => store.totalsForFormation(props.formation))
const isSpent = computed(() => totals.value.steps === 0)
const canReturnToReserve = computed(() => totals.value.steps > 0)

function fatigueShort(fatigue: FatigueLevel): string {
  return fatigue === 'fresh' ? 'Fresh' : String(fatigue)
}
</script>

<template>
  <article :data-formation-id="formation.id">
    <header class="sticky top-0 z-10 flex items-center gap-2 border-b border-border/60 bg-background/95 px-3 py-2 backdrop-blur">
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-sm font-bold text-foreground">{{ formation.name }}</h3>
        <p class="text-[10px] text-muted-foreground">
          {{ STATUS_LABELS[formation.status] }} ·
          <span class="tabular-nums">{{ totals.steps }} / {{ totals.startingSteps }}</span> steps
        </p>
      </div>
      <button
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition-colors active:bg-muted"
        aria-label="Close details"
        @click="emit('close')"
      >
        <X class="h-5 w-5" />
      </button>
    </header>

    <div class="px-3 pb-3">
      <div class="grid gap-2.5 pt-3 sm:grid-cols-2">
        <div class="rounded-md border border-border/60 bg-background/40 p-2.5">
          <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Posture
          </div>
          <button
            type="button"
            class="flex h-11 w-full items-center justify-center gap-2 rounded-md border text-sm font-semibold transition-colors"
            :class="
              formation.preparedDefense
                ? 'border-primary/60 bg-primary/20 text-primary'
                : 'border-border bg-secondary text-muted-foreground'
            "
            :aria-pressed="formation.preparedDefense"
            @click="store.togglePreparedDefense(formation.id)"
          >
            <ShieldCheck class="h-4 w-4" />
            Prepared Defense
          </button>
        </div>

        <div class="rounded-md border border-border/60 bg-background/40 p-2.5">
          <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Fatigue
          </div>
          <div class="flex gap-1">
            <button
              v-for="level in FATIGUE_LEVELS"
              :key="String(level)"
              type="button"
              class="h-11 min-w-0 flex-1 rounded-md border text-xs font-semibold transition-colors"
              :class="
                formation.fatigue === level
                  ? 'border-primary/60 bg-primary/20 text-primary'
                  : 'border-border bg-secondary text-muted-foreground'
              "
              :aria-pressed="formation.fatigue === level"
              :aria-label="fatigueLabel(level)"
              @click="store.setFatigue(formation.id, level)"
            >
              {{ fatigueShort(level) }}
            </button>
          </div>
        </div>

        <div class="rounded-md border border-border/60 bg-background/40 p-2.5">
          <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Support
          </div>
          <Input
            :model-value="formation.support"
            class="h-11"
            placeholder="Placeholder support unit"
            aria-label="Assigned support"
            @update:model-value="store.setSupport(formation.id, String($event))"
          />
        </div>

        <div class="rounded-md border border-border/60 bg-background/40 p-2.5">
          <div class="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Artillery points
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary text-foreground transition-colors active:bg-muted disabled:opacity-40"
              :disabled="formation.artilleryPoints <= 0"
              aria-label="Remove one artillery point"
              @click="store.adjustArtilleryPoints(formation.id, -1)"
            >
              <Minus class="h-5 w-5" />
            </button>
            <div class="flex min-w-0 flex-1 items-center justify-center gap-1 text-xl font-bold tabular-nums text-foreground">
              <Crosshair class="h-4 w-4 text-sky-400" />
              {{ formation.artilleryPoints }}
            </div>
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary text-foreground transition-colors active:bg-muted"
              aria-label="Add one artillery point"
              @click="store.adjustArtilleryPoints(formation.id, 1)"
            >
              <Plus class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div class="mt-3">
        <div class="mb-1 flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Units
          </span>
          <span class="text-[10px] text-muted-foreground">{{ formation.units.length }} units</span>
        </div>
        <div class="divide-y divide-border/50">
          <UnitStepRow
            v-for="unit in formation.units"
            :key="unit.id"
            :formation="formation"
            :unit="unit"
          />
        </div>
      </div>

      <p v-if="isSpent" class="mt-2 rounded-md bg-red-500/10 px-2.5 py-2 text-xs text-red-400">
        This formation has no steps left. Send it to the Dead Pool when it is destroyed.
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted disabled:opacity-40"
          :disabled="!canReturnToReserve"
          @click="store.returnToReserve(formation.id)"
        >
          <RotateCcw class="h-4 w-4" />
          Return to reserve
        </button>
        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 text-xs font-semibold text-red-400 transition-colors active:bg-red-500/20"
          @click="store.sendToDeadPool(formation.id)"
        >
          <Skull class="h-4 w-4" />
          Send to Dead Pool
        </button>
      </div>
    </div>
  </article>
</template>
