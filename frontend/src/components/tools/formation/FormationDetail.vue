<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Crosshair,
  Minus,
  Plus,
  RotateCcw,
  Route,
  ShieldCheck,
  Skull,
  X,
} from '@lucide/vue'
import SupportPickerDialog from '@/components/tools/formation/SupportPickerDialog.vue'
import UnitStepRow from '@/components/tools/formation/UnitStepRow.vue'
import ValuePickerDialog from '@/components/tools/formation/ValuePickerDialog.vue'
import { useFormationManagerStore } from '@/stores/formationManager'
import {
  ARTILLERY_MAX,
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
const fatiguePickerOpen = ref(false)
const artilleryPickerOpen = ref(false)
const supportPickerOpen = ref(false)
const totals = computed(() => store.totalsForFormation(props.formation))
const isSpent = computed(() => totals.value.steps === 0)
const canReturnToReserve = computed(() => totals.value.steps > 0)

const fatigueOptions = FATIGUE_LEVELS.map((level) => ({ value: String(level), label: fatigueLabel(level) }))
const artilleryOptions = Array.from({ length: ARTILLERY_MAX + 1 }, (_, value) => ({
  value: String(value),
  label: String(value),
}))

const supportGroups = computed(() => {
  const sameSide = (store.current?.formations ?? []).filter(
    (formation) => formation.side === props.formation.side,
  )
  return sameSide
    .filter((formation) => formation.units.length > 0)
    .map((formation) => ({
      label: formation.name,
      units: formation.units.map((unit) => unit.name),
    }))
})

const fatigueIndex = computed(() => FATIGUE_LEVELS.indexOf(props.formation.fatigue))
const canDecreaseFatigue = computed(() => fatigueIndex.value > 0)
const canIncreaseFatigue = computed(
  () => fatigueIndex.value < FATIGUE_LEVELS.length - 1,
)

function fatigueShort(fatigue: FatigueLevel): string {
  return fatigue === 'fresh' ? 'Fresh' : String(fatigue)
}

function stepFatigue(delta: number): void {
  const next = FATIGUE_LEVELS[fatigueIndex.value + delta]
  if (next !== undefined) store.setFatigue(props.formation.id, next)
}

function chooseFatigue(value: string): void {
  store.setFatigue(
    props.formation.id,
    value === 'fresh' ? 'fresh' : (Number(value) as FatigueLevel),
  )
}

function chooseArtillery(value: string): void {
  store.setArtilleryPoints(props.formation.id, Number(value))
}
</script>

<template>
  <article :data-formation-id="formation.id" class="flex min-h-0 flex-col bg-card/20">
    <header
      class="sticky top-0 z-10 shrink-0 border-b border-border/70 bg-background/95 px-2 py-1.5 backdrop-blur"
    >
      <div class="flex items-center gap-1.5">
        <div class="min-w-0 flex-1">
          <h3 class="truncate text-[13px] font-bold leading-tight text-foreground">
            {{ formation.name }}
          </h3>
          <p class="text-[9px] uppercase tracking-wide text-muted-foreground">
            {{ STATUS_LABELS[formation.status] }} ·
            <span class="tabular-nums">{{ totals.steps }} / {{ totals.startingSteps }}</span>
            steps
          </p>
        </div>

        <button
          type="button"
          class="flex h-8 shrink-0 items-center justify-center gap-1 rounded border px-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors"
          :class="
            formation.preparedDefense
              ? 'border-primary/60 bg-primary/20 text-primary'
              : 'border-border bg-secondary text-muted-foreground'
          "
          :aria-pressed="formation.preparedDefense"
          aria-label="Prepared Defense"
          title="Prepared Defense"
          @click="store.togglePreparedDefense(formation.id)"
        >
          <ShieldCheck class="h-3.5 w-3.5" />
          PD
        </button>

        <button
          type="button"
          class="flex h-8 shrink-0 items-center justify-center gap-1 rounded border px-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors"
          :class="
            formation.completeMsr
              ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-400'
              : 'border-border bg-secondary text-muted-foreground'
          "
          :aria-pressed="formation.completeMsr"
          aria-label="Complete MSR"
          title="Complete MSR"
          @click="store.toggleCompleteMsr(formation.id)"
        >
          <Route class="h-3.5 w-3.5" />
          MSR
        </button>

        <div
          class="flex h-8 shrink-0 items-center rounded border border-border bg-secondary"
          title="Fatigue"
        >
          <button
            type="button"
            class="flex h-full w-6 items-center justify-center text-muted-foreground transition-colors active:bg-muted disabled:opacity-30"
            :disabled="!canDecreaseFatigue"
            aria-label="Reduce fatigue"
            @click="stepFatigue(-1)"
          >
            <Minus class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="min-w-8 border-x border-border/70 px-1 text-center text-[11px] font-bold tabular-nums text-foreground transition-colors active:bg-muted"
            aria-label="Choose fatigue"
            :title="fatigueLabel(formation.fatigue)"
            @click="fatiguePickerOpen = true"
          >
            {{ fatigueShort(formation.fatigue) }}
          </button>
          <button
            type="button"
            class="flex h-full w-6 items-center justify-center text-muted-foreground transition-colors active:bg-muted disabled:opacity-30"
            :disabled="!canIncreaseFatigue"
            aria-label="Increase fatigue"
            @click="stepFatigue(1)"
          >
            <Plus class="h-3.5 w-3.5" />
          </button>
        </div>

        <div
          class="flex h-8 shrink-0 items-center rounded border border-border bg-secondary"
          title="Artillery points"
        >
          <button
            type="button"
            class="flex h-full w-6 items-center justify-center text-muted-foreground transition-colors active:bg-muted disabled:opacity-30"
            :disabled="formation.artilleryPoints <= 0"
            aria-label="Remove one artillery point"
            @click="store.adjustArtilleryPoints(formation.id, -1)"
          >
            <Minus class="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            class="flex min-w-8 items-center justify-center gap-0.5 border-x border-border/70 px-1 text-[11px] font-bold tabular-nums text-foreground transition-colors active:bg-muted"
            aria-label="Choose artillery points"
            :title="`Artillery points: ${formation.artilleryPoints}`"
            @click="artilleryPickerOpen = true"
          >
            <Crosshair class="h-3 w-3 text-sky-400" />
            {{ formation.artilleryPoints }}
          </button>
          <button
            type="button"
            class="flex h-full w-6 items-center justify-center text-muted-foreground transition-colors active:bg-muted disabled:opacity-30"
            :disabled="formation.artilleryPoints >= ARTILLERY_MAX"
            aria-label="Add one artillery point"
            @click="store.adjustArtilleryPoints(formation.id, 1)"
          >
            <Plus class="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-secondary text-muted-foreground transition-colors active:bg-muted"
          aria-label="Close details"
          @click="emit('close')"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
      <div class="flex items-center gap-2 border-b border-border/60 py-1.5">
        <span class="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          Support
        </span>
        <button
          type="button"
          class="min-w-0 flex-1 truncate rounded border border-border/70 bg-secondary px-2 py-1 text-left text-[11px] font-medium transition-colors active:bg-muted"
          :class="formation.support.trim() === '' ? 'text-muted-foreground' : 'text-foreground'"
          aria-label="Assigned support"
          :title="formation.support || 'No support assigned'"
          @click="supportPickerOpen = true"
        >
          {{ formation.support.trim() === '' ? 'No support assigned' : formation.support }}
        </button>
      </div>

      <div class="mt-2">
        <div class="mb-0.5 flex items-center justify-between">
          <span class="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Units
          </span>
          <span class="text-[9px] text-muted-foreground">{{ formation.units.length }} units</span>
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

      <p v-if="isSpent" class="mt-2 rounded bg-red-500/10 px-2 py-1.5 text-[11px] text-red-400">
        This formation has no steps left. Send it to the Dead Pool when it is destroyed.
      </p>

      <div class="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          class="inline-flex h-8 items-center gap-1.5 rounded border border-border bg-secondary px-2 text-[10px] font-semibold text-muted-foreground transition-colors active:bg-muted disabled:opacity-40"
          :disabled="!canReturnToReserve"
          @click="store.returnToReserve(formation.id)"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          Return to reserve
        </button>
        <button
          type="button"
          class="inline-flex h-8 items-center gap-1.5 rounded border border-red-500/40 bg-red-500/10 px-2 text-[10px] font-semibold text-red-400 transition-colors active:bg-red-500/20"
          @click="store.sendToDeadPool(formation.id)"
        >
          <Skull class="h-3.5 w-3.5" />
          Send to Dead Pool
        </button>
      </div>
    </div>

    <SupportPickerDialog
      v-model:open="supportPickerOpen"
      :groups="supportGroups"
      :selected="formation.support"
      @select="store.setSupport(formation.id, $event)"
    />
    <ValuePickerDialog
      v-model:open="fatiguePickerOpen"
      title="Fatigue"
      description="Fresh, then levels 0 through 4."
      :options="fatigueOptions"
      :selected="String(formation.fatigue)"
      @select="chooseFatigue"
    />
    <ValuePickerDialog
      v-model:open="artilleryPickerOpen"
      title="Artillery points"
      description="Usually 0–3, maximum 5."
      :options="artilleryOptions"
      :selected="String(formation.artilleryPoints)"
      @select="chooseArtillery"
    />
  </article>
</template>
