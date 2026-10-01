<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

useModalShortcutGuard(() => props.open)
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Discard changes?</DialogTitle>
        <DialogDescription>You have unsaved changes that will be lost.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" @click="emit('update:open', false)">Keep editing</Button>
        <Button variant="destructive" @click="emit('confirm')">Discard</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
