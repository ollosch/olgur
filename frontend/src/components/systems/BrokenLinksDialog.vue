<script setup lang="ts">
import { watch } from 'vue'
import { useBrokenLinks } from '@/composables/useBrokenLinks'
import { useSystemStore } from '@/stores/system'

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
}>()

const systemStore = useSystemStore()
const { results, loading, run } = useBrokenLinks()

useModalShortcutGuard(() => props.open)

watch(
  () => props.open,
  (open) => {
    if (open) run(systemStore.currentSystem?.id ?? '')
  },
)
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Broken Links</DialogTitle>
        <DialogDescription>Rule references that do not resolve to an existing rule.</DialogDescription>
      </DialogHeader>

      <p v-if="loading" class="text-sm text-muted-foreground">Scanning…</p>

      <p v-else-if="results.length === 0" class="text-sm text-muted-foreground">
        No broken links found.
      </p>

      <ul v-else class="space-y-2 max-h-[60vh] overflow-y-auto">
        <li
          v-for="(item, index) in results"
          :key="index"
          class="flex items-baseline gap-2 text-sm"
        >
          <span class="font-mono text-xs text-primary shrink-0">{{ item.kind }}</span>
          <span class="text-muted-foreground/80 shrink-0">{{ item.module }} / {{ item.location }}</span>
          <span class="font-mono text-xs text-destructive truncate">{{ item.reference }}</span>
          <span class="text-muted-foreground text-xs shrink-0">{{ item.reason }}</span>
        </li>
      </ul>

      <DialogFooter>
        <Button variant="ghost" @click="emit('update:open', false)">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
