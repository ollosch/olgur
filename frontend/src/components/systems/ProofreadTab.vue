<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { ScrollArea } from '@/components/ui/scroll-area'
import { renderContent } from '@/lib/renderContent'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { useProofreadStore, type NeedsProofreadingEntry } from '@/stores/proofread'
import ProofreadToggle from '@/components/systems/ProofreadToggle.vue'

const router = useRouter()
const route = useRoute()
const panelStore = useLeftPanelStore()
const proofreadStore = useProofreadStore()

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
}
</script>

<template>
  <ScrollArea class="h-full">
    <div class="py-2">
      <div
        v-if="proofreadStore.needsProofreading.length === 0"
        class="px-4 py-4 text-xs text-muted-foreground text-center"
      >
        Nothing needs proofreading.
      </div>

      <div
        v-for="entry in proofreadStore.needsProofreading"
        :key="`${entry.type}:${entry.id}`"
        class="w-full flex items-center gap-1 px-2 py-1.5 hover:bg-muted/30 transition-colors group"
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
  </ScrollArea>
</template>
