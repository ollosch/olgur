<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'
import { useLeaveSystemConfirm } from '@/composables/useLeaveSystemConfirm'

const { open, confirm, cancel } = useLeaveSystemConfirm()

useModalShortcutGuard(open)
</script>

<template>
  <Dialog
    :open="open"
    @update:open="
      (value) => {
        if (!value) cancel()
      }
    "
  >
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Leave this system?</DialogTitle>
        <DialogDescription>
          You're about to go back to the home screen. Do you really want to leave?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="ghost" @click="cancel">Stay</Button>
        <Button variant="default" @click="confirm">Leave</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
