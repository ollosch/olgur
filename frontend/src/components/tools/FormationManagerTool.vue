<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Download,
  FolderOpen,
  Plus,
  ShieldCheck,
  Skull,
  Swords,
  Users,
} from '@lucide/vue'
import { toast } from 'vue-sonner'
import FormationTile from '@/components/tools/formation/FormationTile.vue'
import FormationDetail from '@/components/tools/formation/FormationDetail.vue'
import AddFormationDialog from '@/components/tools/formation/AddFormationDialog.vue'
import NewScenarioDialog from '@/components/tools/formation/NewScenarioDialog.vue'
import ScenarioLibrary from '@/components/tools/formation/ScenarioLibrary.vue'
import { downloadTextFile, safeFilename } from '@/lib/download'
import { formationTotals } from '@/lib/formations'
import { useFormationManagerStore } from '@/stores/formationManager'
import { SIDE_LABELS, type FormationSide } from '@/types/formation'

const store = useFormationManagerStore()

const newScenarioOpen = ref(false)
const addFormationOpen = ref(false)

const sides: FormationSide[] = ['allies', 'germans']

const sideData = computed(() => store.sides[store.activeSide])
const reserveCount = computed(() => sideData.value.reserve.length)
const deadPool = computed(() => sideData.value.deadPool)

const saveLabel = computed(() => {
  if (store.saveError) return 'Save failed'
  if (store.saving) return 'Saving…'
  if (store.lastSavedAt && store.current && store.current.updatedAt !== store.lastSavedAt) {
    return 'Saving…'
  }
  if (store.lastSavedAt) return 'Saved'
  return 'Autosave on'
})

function backToLibrary(): void {
  void store.closeScenario()
}

async function exportCurrent(): Promise<void> {
  const scenario = store.current
  if (!scenario) return
  try {
    const contents = await store.exportScenario(scenario.id)
    downloadTextFile(`${safeFilename(scenario.name)}.formation.json`, contents)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not export the scenario.')
  }
}

function selectSide(side: FormationSide): void {
  store.setActiveSide(side)
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') {
    void store.flushSave()
  }
}

onMounted(() => {
  void store.loadScenarios()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  void store.flushSave()
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-background">
    <div v-if="!store.ready" class="flex flex-1 items-center justify-center">
      <div
        class="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
      />
    </div>

    <ScenarioLibrary
      v-else-if="!store.current"
      @new="newScenarioOpen = true"
    />

    <template v-else>
      <!-- Scenario toolbar -->
      <div
        class="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2.5"
      >
        <button
          type="button"
          class="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted"
          @click="backToLibrary"
        >
          <FolderOpen class="h-4 w-4" />
          Scenarios
        </button>

        <div class="min-w-0 flex-1">
          <h2 class="truncate text-sm font-semibold text-foreground">{{ store.current.name }}</h2>
          <p class="text-[10px]" :class="store.saveError ? 'text-red-400' : 'text-muted-foreground'">
            {{ saveLabel }}
          </p>
        </div>

        <button
          type="button"
          class="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted"
          @click="exportCurrent"
        >
          <Download class="h-4 w-4" />
          Export
        </button>
        <button
          type="button"
          class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          @click="newScenarioOpen = true"
        >
          <Plus class="h-4 w-4" />
          New
        </button>
      </div>

      <!-- Side switcher -->
      <div class="shrink-0 border-b border-border px-3 py-2">
        <div class="grid grid-cols-2 gap-2" aria-label="Side">
          <button
            v-for="side in sides"
            :key="side"
            type="button"
            :aria-pressed="store.activeSide === side"
            class="flex min-h-14 flex-col items-start justify-center rounded-md border px-3 py-2 text-left transition-colors"
            :class="
              store.activeSide === side
                ? 'border-primary/60 bg-primary/10'
                : 'border-border bg-card/50 active:bg-muted/40'
            "
            @click="selectSide(side)"
          >
            <span class="flex w-full items-center justify-between gap-2">
              <span
                class="text-sm font-bold"
                :class="store.activeSide === side ? 'text-primary' : 'text-foreground'"
              >
                {{ SIDE_LABELS[side] }}
              </span>
              <span class="text-[10px] font-semibold text-muted-foreground">
                {{ store.sides[side].inPlay.length }} fm
              </span>
            </span>
            <span class="mt-1 flex w-full items-center gap-2">
              <span class="text-xs font-semibold tabular-nums text-foreground">
                {{ store.sides[side].totals.steps }}
                <span class="font-normal text-muted-foreground">
                  / {{ store.sides[side].totals.startingSteps }}
                </span>
              </span>
              <span class="text-[10px] text-muted-foreground">steps</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Board -->
      <div class="flex min-h-0 flex-1 flex-col">
        <div
          class="min-h-0 overflow-y-auto px-3 py-3"
          :class="store.selectedFormation ? 'shrink-0 basis-[44%]' : 'flex-1'"
        >
          <div
            class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground"
          >
            <span class="inline-flex items-center gap-1">
              <Swords class="h-3.5 w-3.5" />
              {{ sideData.inPlay.length }} in play
            </span>
            <span class="inline-flex items-center gap-1">
              <Users class="h-3.5 w-3.5" />
              {{ sideData.inPlay.reduce((sum, formation) => sum + formation.units.length, 0) }} units
            </span>
            <span class="inline-flex items-center gap-1">
              <ShieldCheck class="h-3.5 w-3.5" />
              {{ sideData.totals.steps }} / {{ sideData.totals.startingSteps }} steps
            </span>
          </div>

          <div
            v-if="sideData.inPlay.length === 0"
            class="rounded-lg border border-dashed border-border p-8 text-center"
          >
            <Swords class="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p class="mt-2 text-sm font-semibold text-foreground">No formations in play</p>
            <p class="mt-1 text-xs text-muted-foreground">
              Add formations from reserve to start tracking {{ SIDE_LABELS[store.activeSide] }}.
            </p>
          </div>

          <div
            v-else
            class="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2"
          >
            <FormationTile
              v-for="formation in sideData.inPlay"
              :key="formation.id"
              :formation="formation"
              :selected="store.selectedFormationId === formation.id"
              @select="store.selectFormation(formation.id)"
            />
          </div>

          <!-- Dead Pool -->
          <section v-if="deadPool.length > 0" class="mt-5">
            <div class="mb-2 flex items-center gap-2">
              <Skull class="h-4 w-4 text-red-400" />
              <h3 class="text-xs font-bold uppercase tracking-wide text-red-400">Dead Pool</h3>
              <span class="text-[10px] text-muted-foreground">
                {{ deadPool.length }} formations · rebuild keeps current state
              </span>
            </div>
            <div class="space-y-1.5">
              <div
                v-for="formation in deadPool"
                :key="formation.id"
                class="flex items-center gap-3 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2"
              >
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-medium text-foreground">{{ formation.name }}</div>
                  <div class="text-[10px] text-muted-foreground">
                    {{ formationTotals(formation).steps }} /
                    {{ formationTotals(formation).startingSteps }} steps
                  </div>
                </div>
                <button
                  type="button"
                  class="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted"
                  @click="store.rebuild(formation.id)"
                >
                  <Swords class="h-4 w-4" />
                  Rebuild
                </button>
              </div>
            </div>
          </section>
        </div>

        <div
          v-if="store.selectedFormation"
          class="flex min-h-0 flex-1 flex-col border-t border-border"
        >
          <FormationDetail
            :key="store.selectedFormation.id"
            :formation="store.selectedFormation"
            class="min-h-0 flex-1 overflow-y-auto"
            @close="store.clearSelectedFormation()"
          />
        </div>
      </div>

      <!-- Add formations -->
      <div class="shrink-0 border-t border-border px-3 py-2.5">
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-border bg-secondary text-sm font-semibold text-foreground transition-colors active:bg-muted disabled:opacity-40"
          :disabled="reserveCount === 0"
          @click="addFormationOpen = true"
        >
          <Plus class="h-4 w-4" />
          Add formations
          <span class="text-xs font-normal text-muted-foreground">
            ({{ reserveCount }} in reserve)
          </span>
        </button>
      </div>
    </template>

    <NewScenarioDialog v-model:open="newScenarioOpen" />
    <AddFormationDialog v-model:open="addFormationOpen" />
  </div>
</template>
