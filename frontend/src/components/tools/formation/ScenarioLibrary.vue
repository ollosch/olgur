<script setup lang="ts">
import { computed, ref } from 'vue'
import { Download, FolderOpen, Plus, Trash2, Upload, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { downloadTextFile, safeFilename } from '@/lib/download'
import { totalsFor } from '@/lib/formations'
import { useFormationManagerStore } from '@/stores/formationManager'
import { SIDE_LABELS, type Scenario } from '@/types/formation'

const emit = defineEmits<{
  new: []
  close: []
}>()

const store = useFormationManagerStore()
const fileInput = ref<HTMLInputElement | null>(null)
const confirmDeleteId = ref<string | null>(null)
const busy = ref(false)

const deleteTarget = computed(
  () => store.scenarios.find((scenario) => scenario.id === confirmDeleteId.value) ?? null,
)

function totalsForScenario(scenario: Scenario, side: 'allies' | 'germans') {
  return totalsFor(
    scenario.formations.filter(
      (formation) => formation.side === side && formation.status === 'in_game',
    ),
  )
}

function open(id: string): void {
  void store.openScenario(id)
}

async function exportScenario(scenario: Scenario): Promise<void> {
  try {
    const contents = await store.exportScenario(scenario.id)
    downloadTextFile(`${safeFilename(scenario.name)}.formation.json`, contents)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not export the scenario.')
  }
}

function triggerImport(): void {
  fileInput.value?.click()
}

async function onFileChosen(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  busy.value = true
  try {
    const scenario = await store.importScenario(await file.text())
    toast.success(`Imported ${scenario.name}.`)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not import the scenario.')
  } finally {
    busy.value = false
  }
}

async function confirmDelete(): Promise<void> {
  const id = confirmDeleteId.value
  if (!id) return
  await store.deleteScenario(id)
  confirmDeleteId.value = null
  toast.success('Scenario deleted.')
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      class="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5"
    >
      <div class="flex items-center gap-2">
        <FolderOpen class="h-5 w-5 text-primary" />
        <div>
          <h2 class="text-sm font-semibold text-foreground">Formation Manager</h2>
          <p class="text-[10px] text-muted-foreground">Saved on this device</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-11 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted disabled:opacity-40"
          :disabled="busy"
          @click="triggerImport"
        >
          <Upload class="h-4 w-4" />
          Import
        </button>
        <button
          type="button"
          class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          @click="emit('new')"
        >
          <Plus class="h-4 w-4" />
          New scenario
        </button>
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition-colors active:bg-muted"
          aria-label="Close tool"
          @click="emit('close')"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="hidden"
      @change="onFileChosen"
    />

    <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      <div
        v-if="store.scenarios.length === 0"
        class="flex h-full flex-col items-center justify-center gap-3 text-center"
      >
        <FolderOpen class="h-10 w-10 text-muted-foreground/40" />
        <div>
          <p class="text-sm font-semibold text-foreground">No saved scenarios yet</p>
          <p class="mt-1 max-w-sm text-xs text-muted-foreground">
            Create a scenario, pick the formations that start in play, and the tool keeps your step,
            fatigue, and support state as you play.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
          @click="emit('new')"
        >
          <Plus class="h-4 w-4" />
          New scenario
        </button>
      </div>

      <div v-else class="space-y-2">
        <article
          v-for="scenario in store.scenarios"
          :key="scenario.id"
          class="rounded-lg border border-border/80 bg-card/70 p-3"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="truncate text-sm font-semibold text-foreground">{{ scenario.name }}</h3>
              </div>
              <p class="mt-0.5 text-[10px] text-muted-foreground">
                Updated {{ formatDate(scenario.updatedAt) }}
              </p>

              <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <span
                  v-for="side in ['allies', 'germans'] as const"
                  :key="side"
                  class="text-[11px] text-muted-foreground"
                >
                  {{ SIDE_LABELS[side] }}:
                  <span class="font-semibold text-foreground">
                    {{ totalsForScenario(scenario, side).steps }}
                  </span>
                  / {{ totalsForScenario(scenario, side).startingSteps }} steps
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
                @click="open(scenario.id)"
              >
                Open
              </button>
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground transition-colors active:bg-muted"
                title="Export scenario"
                aria-label="Export scenario"
                @click="exportScenario(scenario)"
              >
                <Download class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-md border border-red-500/40 bg-red-500/10 text-red-400 transition-colors active:bg-red-500/20"
                title="Delete scenario"
                aria-label="Delete scenario"
                @click="confirmDeleteId = scenario.id"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <Dialog
      :open="confirmDeleteId !== null"
      @update:open="confirmDeleteId = $event ? confirmDeleteId : null"
    >
      <DialogContent>
        <DialogTitle class="text-sm font-semibold text-foreground">Delete scenario?</DialogTitle>
        <DialogDescription class="text-xs text-muted-foreground">
          {{ deleteTarget?.name }} will be removed from this device. Export it first if you want a
          backup.
        </DialogDescription>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="inline-flex h-11 items-center rounded-md border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground"
            @click="confirmDeleteId = null"
          >
            Cancel
          </button>
          <button
            type="button"
            class="inline-flex h-11 items-center rounded-md bg-red-500 px-3 text-xs font-semibold text-white"
            @click="confirmDelete"
          >
            Delete
          </button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
