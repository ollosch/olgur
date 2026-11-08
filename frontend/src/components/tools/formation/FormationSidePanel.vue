<script setup lang="ts">
import { Plus, Skull, Swords } from '@lucide/vue'
import FormationTile from '@/components/tools/formation/FormationTile.vue'
import { formationIsDestroyed, formationTotals } from '@/lib/formations'
import { SIDE_LABELS, type Formation, type FormationSide, type StepTotals } from '@/types/formation'

defineProps<{
  side: FormationSide
  formations: Formation[]
  deadPool: Formation[]
  totals: StepTotals
  selectedId: string | null
  reserveCount: number
}>()

const emit = defineEmits<{
  select: [id: string]
  add: []
  rebuild: [id: string]
}>()

function accentClass(side: FormationSide): string {
  return side === 'allies' ? 'text-sky-400' : 'text-amber-400'
}

function unitCount(formations: Formation[]): number {
  return formations.reduce((sum, formation) => sum + formation.units.length, 0)
}
</script>

<template>
  <section
    class="flex min-h-0 min-w-0 flex-1 flex-col bg-gradient-to-b from-card/30 to-background/60"
  >
    <header
      class="shrink-0 border-b border-t-2 border-border/70 bg-gradient-to-b from-card/60 to-card/30 px-2.5 py-1.5"
      :class="side === 'allies' ? 'border-t-sky-500/70' : 'border-t-amber-500/70'"
    >
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-bold uppercase tracking-[0.14em]" :class="accentClass(side)">
          {{ SIDE_LABELS[side] }}
        </span>
        <span class="text-[10px] font-semibold tabular-nums text-muted-foreground">
          {{ formations.length }} fm · {{ unitCount(formations) }} units · {{ totals.steps }}/{{
            totals.startingSteps
          }}
        </span>
        <button
          type="button"
          class="ml-auto inline-flex h-7 shrink-0 items-center gap-1 rounded border border-border/80 bg-secondary px-2 text-[10px] font-semibold text-muted-foreground transition-colors active:bg-muted disabled:opacity-40"
          :disabled="reserveCount === 0"
          :aria-label="`Add ${SIDE_LABELS[side]} formations`"
          @click="emit('add')"
        >
          <Plus class="h-3 w-3" />
          {{ reserveCount }}
        </button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
      <div
        v-if="formations.length === 0"
        class="rounded-md border border-dashed border-border/70 px-3 py-6 text-center"
      >
        <Swords class="mx-auto h-6 w-6 text-muted-foreground/40" />
        <p class="mt-1.5 text-xs font-semibold text-foreground">No formations in play</p>
        <p class="mt-0.5 text-[10px] text-muted-foreground">
          Add {{ SIDE_LABELS[side] }} formations from reserve.
        </p>
      </div>

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-1.5">
        <FormationTile
          v-for="formation in formations"
          :key="formation.id"
          :formation="formation"
          :selected="selectedId === formation.id"
          @select="emit('select', formation.id)"
        />
      </div>

      <section v-if="deadPool.length > 0" class="mt-3">
        <div class="mb-1 flex items-center gap-1.5">
          <Skull class="h-3.5 w-3.5 text-red-400" />
          <h3 class="text-[10px] font-bold uppercase tracking-wide text-red-400">Dead Pool</h3>
          <span class="text-[9px] text-muted-foreground">{{ deadPool.length }}</span>
        </div>
        <div class="space-y-1">
          <div
            v-for="formation in deadPool"
            :key="formation.id"
            class="flex items-center gap-2 rounded border border-red-500/25 bg-red-500/5 px-2 py-1"
          >
            <div class="min-w-0 flex-1">
              <div class="truncate text-[11px] font-medium text-foreground">
                {{ formation.name }}
              </div>
              <div class="text-[9px] tabular-nums text-muted-foreground">
                {{ formationTotals(formation).steps }} /
                {{ formationTotals(formation).startingSteps }} steps
                <span v-if="formationIsDestroyed(formation)" class="text-red-400">
                  · HQ + Train removed
                </span>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex h-7 items-center gap-1 rounded border border-border bg-secondary px-2 text-[10px] font-semibold text-muted-foreground transition-colors active:bg-muted"
              @click="emit('rebuild', formation.id)"
            >
              <Swords class="h-3 w-3" />
              Rebuild
            </button>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
