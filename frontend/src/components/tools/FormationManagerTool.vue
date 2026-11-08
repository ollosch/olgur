<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Download, FolderOpen, Plus, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import FormationSidePanel from '@/components/tools/formation/FormationSidePanel.vue'
import FormationDetail from '@/components/tools/formation/FormationDetail.vue'
import AddFormationDialog from '@/components/tools/formation/AddFormationDialog.vue'
import NewScenarioDialog from '@/components/tools/formation/NewScenarioDialog.vue'
import ScenarioLibrary from '@/components/tools/formation/ScenarioLibrary.vue'
import { downloadTextFile, safeFilename } from '@/lib/download'
import { useFormationManagerStore } from '@/stores/formationManager'
import { useToolModalStore } from '@/stores/toolModal'
import type { FormationSide } from '@/types/formation'

const store = useFormationManagerStore()
const toolModal = useToolModalStore()

const newScenarioOpen = ref(false)
const addFormationOpen = ref(false)
const addSide = ref<FormationSide>('allies')
const rootRef = ref<HTMLElement | null>(null)

const panes = computed((): Array<{ side: FormationSide; showDetail: boolean }> => [
  { side: 'allies', showDetail: store.selectedFormation?.side === 'germans' },
  { side: 'germans', showDetail: store.selectedFormation?.side === 'allies' },
])

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

function openAdd(side: FormationSide): void {
  addSide.value = side
  addFormationOpen.value = true
}

function closeDetail(): void {
  const formationId = store.selectedFormationId
  store.clearSelectedFormation()
  if (!formationId) return
  void nextTick(() => {
    const tile = Array.from(
      rootRef.value?.querySelectorAll<HTMLButtonElement>('button[data-formation-id]') ?? [],
    ).find((element) => element.dataset.formationId === formationId)
    tile?.focus()
  })
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
      @close="toolModal.close()"
    />

    <template v-else>
      <!-- Scenario toolbar -->
      <div
        class="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card/40 px-3 py-1.5"
      >
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted"
          @click="backToLibrary"
        >
          <FolderOpen class="h-4 w-4" />
          Scenarios
        </button>

        <div class="min-w-0 flex-1">
          <h2 class="truncate text-[13px] font-bold uppercase tracking-wide text-foreground">
            {{ store.current.name }}
          </h2>
          <p
            class="text-[9px] uppercase tracking-wide"
            :class="store.saveError ? 'text-red-400' : 'text-muted-foreground'"
          >
            {{ saveLabel }}
          </p>
        </div>

        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted"
          @click="exportCurrent"
        >
          <Download class="h-4 w-4" />
          Export
        </button>
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          @click="newScenarioOpen = true"
        >
          <Plus class="h-4 w-4" />
          New
        </button>
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition-colors active:bg-muted"
          aria-label="Close tool"
          @click="toolModal.close()"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Split board: the clicked side keeps its list, the opposite side shows the detail -->
      <div ref="rootRef" class="grid min-h-0 flex-1 grid-cols-2 divide-x divide-border/70">
        <template v-for="pane in panes" :key="pane.side">
          <FormationDetail
            v-if="pane.showDetail && store.selectedFormation"
            :key="store.selectedFormation.id"
            :formation="store.selectedFormation"
            class="min-h-0 overflow-y-auto"
            @close="closeDetail"
          />
          <FormationSidePanel
            v-else
            :side="pane.side"
            :formations="store.sides[pane.side].inPlay"
            :dead-pool="store.sides[pane.side].deadPool"
            :totals="store.sides[pane.side].totals"
            :selected-id="store.selectedFormationId"
            :reserve-count="store.sides[pane.side].reserve.length"
            @select="store.selectFormation"
            @add="openAdd(pane.side)"
            @rebuild="store.rebuild"
          />
        </template>
      </div>
    </template>

    <NewScenarioDialog v-model:open="newScenarioOpen" />
    <AddFormationDialog v-model:open="addFormationOpen" :side="addSide" />
  </div>
</template>
