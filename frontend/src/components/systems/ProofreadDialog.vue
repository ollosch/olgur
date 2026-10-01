<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
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
import { renderContent } from '@/lib/renderContent'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { useProofreadStore, type NeedsProofreadingEntry } from '@/stores/proofread'
import ProofreadToggle from '@/components/systems/ProofreadToggle.vue'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()
const route = useRoute()
const panelStore = useLeftPanelStore()
const proofreadStore = useProofreadStore()

useModalShortcutGuard(() => props.open)

function close(): void {
  emit('update:open', false)
}

function navigate(entry: NeedsProofreadingEntry): void {
  const systemId = route.params['systemId'] as string

  if (entry.type === 'rule') {
    router.push({ name: 'system-rule', params: { systemId, ruleId: entry.id } })
  } else if (entry.type === 'game_datum') {
    router.push({ name: 'system-game-datum', params: { systemId, gameDatumId: entry.id } })
  } else {
    panelStore.openToTab('index')
  }

  panelStore.mobileOpen = false
  close()
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Proofread</DialogTitle>
        <DialogDescription>Content that still needs proofreading.</DialogDescription>
      </DialogHeader>

      <div
        v-if="proofreadStore.needsProofreading.length === 0"
        class="text-sm text-muted-foreground"
      >
        Nothing needs proofreading.
      </div>

      <div v-else class="space-y-1 max-h-[60vh] overflow-y-auto">
        <div
          v-for="entry in proofreadStore.needsProofreading"
          :key="`${entry.type}:${entry.id}`"
          class="flex items-center gap-1 pr-2 group"
        >
          <button class="flex items-baseline gap-2 flex-1 min-w-0 text-left" @click="navigate(entry)">
            <span
              v-if="entry.sublabel"
              class="font-mono text-xs text-primary font-semibold shrink-0 w-12 text-right"
            >
              {{ entry.sublabel }}
            </span>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span class="text-xs text-foreground/80 truncate" v-html="renderContent(entry.label)" />
          </button>
          <ProofreadToggle :entity-type="entry.type" :entity-id="entry.id" action-label="Mark done" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="close">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
