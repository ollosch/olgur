<script setup lang="ts">
import { computed } from 'vue'
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Skull,
} from '@lucide/vue'
import { Input } from '@/components/ui/input'
import StepBar from '@/components/tools/formation/StepBar.vue'
import UnitStepRow from '@/components/tools/formation/UnitStepRow.vue'
import { useFormationManagerStore } from '@/stores/formationManager'
import {
  FATIGUE_LEVELS,
  fatigueLabel,
  type FatigueLevel,
  type Formation,
} from '@/types/formation'

const props = defineProps<{
  formation: Formation
  expanded: boolean
}>()

const emit = defineEmits<{
  toggle: []
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
  <article
    class="overflow-hidden rounded-lg border border-border/80 bg-card/70 shadow-sm"
    :class="isSpent ? 'border-red-500/50' : ''"
    :data-formation-id="formation.id"
  >
    <!-- Summary row: the whole left side is one touch target. -->
    <div class="flex items-stretch">
      <button
        type="button"
        class="min-w-0 flex-1 px-3 py-2.5 text-left transition-colors active:bg-muted/40"
        :aria-expanded="expanded"
        @click="emit('toggle')"
      >
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-semibold text-foreground">
                {{ formation.name }}
              </span>
              <span
                v-if="isSpent"
                class="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400"
              >
                No steps
              </span>
            </div>

            <div class="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                v-if="formation.preparedDefense"
                class="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
              >
                <ShieldCheck class="h-3 w-3" />
                Prepared
              </span>
              <span
                class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                :class="
                  formation.fatigue === 'fresh'
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-amber-500/15 text-amber-400'
                "
              >
                {{ fatigueLabel(formation.fatigue) }}
              </span>
              <span
                v-if="formation.artilleryPoints > 0"
                class="inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400"
              >
                <Crosshair class="h-3 w-3" />
                Arty {{ formation.artilleryPoints }}
              </span>
              <span
                v-if="formation.support.trim() !== ''"
                class="max-w-full truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {{ formation.support }}
              </span>
            </div>
          </div>

          <div class="w-24 shrink-0 text-right sm:w-32">
            <div class="text-sm font-bold tabular-nums text-foreground">
              {{ totals.steps }}
              <span class="text-xs font-normal text-muted-foreground">
                / {{ totals.startingSteps }}
              </span>
            </div>
            <StepBar
              :steps="totals.steps"
              :starting-steps="totals.startingSteps"
              class="mt-1.5"
            />
          </div>
        </div>
      </button>

      <button
        type="button"
        class="flex w-11 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground transition-colors active:bg-muted/40"
        :aria-label="expanded ? `Collapse ${formation.name}` : `Expand ${formation.name}`"
        @click="emit('toggle')"
      >
        <ChevronUp v-if="expanded" class="h-5 w-5" />
        <ChevronDown v-else class="h-5 w-5" />
      </button>
    </div>

    <div v-if="expanded" class="border-t border-border/60 px-3 pb-3">
      <!-- Formation-level controls -->
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
            <div class="min-w-0 flex-1 text-center text-xl font-bold tabular-nums text-foreground">
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

      <!-- Individual units -->
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
