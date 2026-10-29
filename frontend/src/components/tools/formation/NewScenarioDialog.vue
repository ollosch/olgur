<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, Swords, X } from '@lucide/vue'
import { toast } from 'vue-sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formationId, formationsForSide } from '@/lib/formations'
import { useFormationManagerStore } from '@/stores/formationManager'
import { SIDE_LABELS, type FormationSide } from '@/types/formation'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const store = useFormationManagerStore()

const name = ref('Arracourt')
const selected = ref<string[]>([])

const sides: FormationSide[] = ['allies', 'germans']

function reset(): void {
  name.value = 'Arracourt'
  selected.value = []
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
)

function blueprintId(side: FormationSide, formationName: string): string {
  return formationId(side, formationName)
}

function isSelected(id: string): boolean {
  return selected.value.includes(id)
}

function toggle(id: string): void {
  selected.value = isSelected(id)
    ? selected.value.filter((entry) => entry !== id)
    : [...selected.value, id]
}

function selectAll(side: FormationSide): void {
  const ids = formationsForSide(side).map((blueprint) => blueprintId(side, blueprint.name))
  selected.value = [...new Set([...selected.value, ...ids])]
}

function clear(side: FormationSide): void {
  const ids = new Set(formationsForSide(side).map((blueprint) => blueprintId(side, blueprint.name)))
  selected.value = selected.value.filter((id) => !ids.has(id))
}

function countFor(side: FormationSide): number {
  return formationsForSide(side).filter((blueprint) =>
    isSelected(blueprintId(side, blueprint.name)),
  ).length
}

const selectedSteps = computed(() =>
  sides.reduce(
    (total, side) =>
      total +
      formationsForSide(side)
        .filter((blueprint) => isSelected(blueprintId(side, blueprint.name)))
        .flatMap((blueprint) => blueprint.units)
        .reduce((sum, unit) => sum + unit.steps, 0),
    0,
  ),
)

async function create(): Promise<void> {
  if (name.value.trim() === '') return
  try {
    await store.createNewScenario(name.value, selected.value)
    emit('update:open', false)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Could not create the scenario.')
  }
}

function close(): void {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      :show-close-button="false"
      class="flex max-h-[92vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
    >
      <div class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <DialogTitle class="text-sm font-semibold text-foreground">
            New Formation Scenario
          </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Select the formations that start in play. The rest wait in reserve.
          </DialogDescription>
        </div>
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors active:bg-muted"
          aria-label="Close"
          @click="close"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <label class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Scenario name
        </label>
        <Input v-model="name" class="mb-4 h-11" placeholder="Arracourt" />

        <div v-for="side in sides" :key="side" class="mb-5 last:mb-0">
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Swords class="h-4 w-4 text-primary" />
              <span class="text-sm font-semibold text-foreground">{{ SIDE_LABELS[side] }}</span>
              <span class="text-xs text-muted-foreground">
                {{ countFor(side) }} / {{ formationsForSide(side).length }} active
              </span>
            </div>
            <div class="flex gap-1">
              <button
                type="button"
                class="inline-flex min-h-11 items-center rounded px-3 text-xs font-semibold text-primary active:bg-muted"
                @click="selectAll(side)"
              >
                All
              </button>
              <button
                type="button"
                class="inline-flex min-h-11 items-center rounded px-3 text-xs font-semibold text-muted-foreground active:bg-muted"
                @click="clear(side)"
              >
                None
              </button>
            </div>
          </div>

          <div class="grid gap-1 sm:grid-cols-2">
            <label
              v-for="blueprint in formationsForSide(side)"
              :key="blueprint.name"
              class="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border/60 px-3 py-2 transition-colors active:bg-muted/50"
              :class="
                isSelected(blueprintId(side, blueprint.name))
                  ? 'border-primary/50 bg-primary/10'
                  : 'bg-background/40'
              "
            >
              <input
                type="checkbox"
                class="h-5 w-5 shrink-0 accent-[var(--primary)]"
                :checked="isSelected(blueprintId(side, blueprint.name))"
                @change="toggle(blueprintId(side, blueprint.name))"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-foreground">
                  {{ blueprint.name }}
                </span>
                <span class="block text-[10px] text-muted-foreground">
                  {{ blueprint.units.length }} units ·
                  {{ blueprint.units.reduce((sum, unit) => sum + unit.steps, 0) }} steps
                </span>
              </span>
              <Check
                v-if="isSelected(blueprintId(side, blueprint.name))"
                class="h-4 w-4 shrink-0 text-primary"
              />
            </label>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-3">
        <span class="text-xs text-muted-foreground">
          {{ selected.length }} formations · {{ selectedSteps }} steps in play
        </span>
        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
          :disabled="name.trim() === ''"
          @click="create"
        >
          <Swords class="h-4 w-4" />
          Start scenario
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
