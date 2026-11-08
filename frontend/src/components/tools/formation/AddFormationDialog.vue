<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Swords, X } from '@lucide/vue'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formationTotals } from '@/lib/formations'
import { useFormationManagerStore } from '@/stores/formationManager'
import { SIDE_LABELS, type FormationSide } from '@/types/formation'

const props = defineProps<{
  open: boolean
  side: FormationSide
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const store = useFormationManagerStore()

const reserve = computed(() => store.sides[props.side].reserve)

function add(id: string): void {
  store.addToPlay(id)
}

function close(): void {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      :show-close-button="false"
      class="flex max-h-[92vh] w-full max-w-xl flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
    >
      <div class="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div>
          <DialogTitle class="text-sm font-semibold text-foreground"> Add formations </DialogTitle>
          <DialogDescription class="text-xs text-muted-foreground">
            Commit reserve formations to play. {{ SIDE_LABELS[side] }}.
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
        <p v-if="reserve.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          Every {{ SIDE_LABELS[side] }} formation is already in play.
        </p>

        <div v-else class="grid gap-1.5 sm:grid-cols-2">
          <div
            v-for="formation in reserve"
            :key="formation.id"
            class="flex min-h-16 items-center gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2"
          >
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium text-foreground">{{ formation.name }}</div>
              <div class="text-[10px] text-muted-foreground">
                {{ formation.units.length }} units · {{ formationTotals(formation).steps }} steps
              </div>
            </div>
            <button
              type="button"
              class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors active:bg-primary/20"
              @click="add(formation.id)"
            >
              <Plus class="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      </div>

      <div class="shrink-0 border-t border-border px-4 py-3">
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
          @click="close"
        >
          <Swords class="h-4 w-4" />
          Done
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
