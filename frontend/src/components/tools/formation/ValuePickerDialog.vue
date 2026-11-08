<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

export interface PickerOption {
  value: string
  label: string
  hint?: string
}

defineProps<{
  open: boolean
  title: string
  description?: string
  options: PickerOption[]
  selected: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [value: string]
}>()

function choose(value: string): void {
  emit('select', value)
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      :show-close-button="false"
      class="flex w-full max-w-sm flex-col gap-0 overflow-hidden p-0 sm:max-w-sm"
    >
      <div class="border-b border-border/70 bg-background/80 px-3 py-2">
        <DialogTitle class="text-xs font-bold uppercase tracking-wide text-foreground">
          {{ title }}
        </DialogTitle>
        <DialogDescription v-if="description" class="text-[10px] text-muted-foreground">
          {{ description }}
        </DialogDescription>
      </div>

      <div class="grid grid-cols-3 gap-1.5 p-3">
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="flex min-h-11 flex-col items-center justify-center rounded border text-sm font-bold tabular-nums transition-colors"
          :class="
            selected === option.value
              ? 'border-primary/70 bg-primary/20 text-primary'
              : 'border-border bg-secondary text-foreground active:bg-muted'
          "
          :aria-pressed="selected === option.value"
          :aria-label="`Select ${option.label}`"
          @click="choose(option.value)"
        >
          {{ option.label }}
          <span v-if="option.hint" class="text-[9px] font-normal text-muted-foreground">
            {{ option.hint }}
          </span>
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
