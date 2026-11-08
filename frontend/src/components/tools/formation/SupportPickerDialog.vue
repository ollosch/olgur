<script setup lang="ts">
import { X } from '@lucide/vue'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

export interface SupportGroup {
  label: string
  units: string[]
}

const props = defineProps<{
  open: boolean
  groups: SupportGroup[]
  selected: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  toggle: [value: string]
  clear: []
}>()

function isSelected(unit: string): boolean {
  return props.selected.includes(unit)
}

function clear(): void {
  emit('clear')
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      :show-close-button="false"
      class="flex max-h-[85vh] w-full max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
    >
      <div class="flex shrink-0 items-start gap-2 border-b border-border/70 px-3 py-2">
        <div class="min-w-0 flex-1">
          <DialogTitle class="text-xs font-bold uppercase tracking-wide text-foreground">
            Assign support
          </DialogTitle>
          <DialogDescription class="text-[10px] text-muted-foreground">
            Pick one or more of this formation's units or independent units.
          </DialogDescription>
        </div>
        <button
          type="button"
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors active:bg-muted"
          aria-label="Close support picker"
          @click="emit('update:open', false)"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <section v-for="group in groups" :key="group.label" class="mb-2 last:mb-0">
          <h4 class="mb-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
            {{ group.label }}
          </h4>
          <div class="grid grid-cols-2 gap-1">
            <button
              v-for="unit in group.units"
              :key="`${group.label}:${unit}`"
              type="button"
              class="truncate rounded border px-2 py-1.5 text-left text-[11px] font-medium transition-colors"
              :class="
                isSelected(unit)
                  ? 'border-primary/70 bg-primary/20 text-primary'
                  : 'border-border bg-secondary text-foreground active:bg-muted'
              "
              :aria-pressed="isSelected(unit)"
              :aria-label="`Toggle support ${unit}`"
              :title="unit"
              @click="emit('toggle', unit)"
            >
              {{ unit }}
            </button>
          </div>
        </section>
      </div>

      <div class="flex shrink-0 items-center gap-2 border-t border-border/70 px-3 py-2">
        <button
          type="button"
          class="inline-flex h-8 flex-1 items-center justify-center rounded border border-border bg-secondary text-[10px] font-semibold text-muted-foreground transition-colors active:bg-muted"
          aria-label="Clear support"
          @click="clear"
        >
          Clear support
        </button>
        <button
          type="button"
          class="inline-flex h-8 flex-1 items-center justify-center rounded bg-primary text-[10px] font-semibold text-primary-foreground transition-opacity"
          aria-label="Done assigning support"
          @click="emit('update:open', false)"
        >
          Done
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
