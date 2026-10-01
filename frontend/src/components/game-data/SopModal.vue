<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { X } from '@lucide/vue'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useContentStore } from '@/stores/content'
import { useGameDataPanelStore } from '@/stores/gameDataPanel'
import { useGameDataModalStore } from '@/stores/gameDataModal'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'
import SopViewer from '@/components/game-data/SopViewer.vue'
import type { GameDatum, SopContent } from '@/types/domain'

const contentStore = useContentStore()
const gameDataModalStore = useGameDataModalStore()

useModalShortcutGuard(() => gameDataModalStore.sopOpen)

// Backed by a store (rather than local refs) so the active SOP survives the
// modal being closed and reopened.
const { activeSopId } = storeToRefs(useGameDataPanelStore())

// SOP is a singular surface: only the selected (or core) module's SOPs.
const sops = computed((): GameDatum[] =>
  contentStore.singularGameData.filter((d) => d.type === 'sop'),
)

const activeSop = computed((): string => {
  if (activeSopId.value && sops.value.some((s) => s.id === activeSopId.value)) {
    return activeSopId.value
  }
  return sops.value[0]?.id ?? ''
})

function sopContent(item: GameDatum): SopContent | null {
  return item.content as unknown as SopContent
}

function onOpenChange(open: boolean): void {
  if (!open) gameDataModalStore.closeSop()
}
</script>

<template>
  <!-- Keep content mounted while hidden so the active SOP tab and its store-backed
       expand/search state survive open → close → open. -->
  <Dialog
    :open="gameDataModalStore.sopOpen"
    :unmount-on-hide="false"
    @update:open="onOpenChange"
  >
    <DialogContent
      :show-close-button="false"
      class="max-w-none sm:max-w-none w-full h-full top-0 left-0 translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col shadow-none"
    >
      <DialogTitle class="sr-only">Sequence of Play</DialogTitle>
      <DialogDescription class="sr-only">Sequence of Play viewer</DialogDescription>

      <div class="shrink-0 flex items-center justify-between h-12 px-4 border-b border-border">
        <span class="text-sm font-semibold text-foreground">Sequence of Play</span>
        <button
          class="flex items-center justify-center w-8 h-8 rounded hover:bg-muted/50 transition-colors"
          title="Close"
          @click="gameDataModalStore.closeSop()"
        >
          <X class="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div class="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div
          v-if="sops.length === 0"
          class="flex-1 flex items-center justify-center text-sm text-muted-foreground"
        >
          No sequence of play data available.
        </div>
        <Tabs
          v-else
          :model-value="activeSop"
          class="flex flex-col flex-1 overflow-hidden"
          @update:model-value="
            (v) => {
              activeSopId = v as string
            }
          "
        >
          <TabsList
            class="shrink-0 w-full rounded-none border-b border-border justify-start px-2 gap-0.5 h-9 overflow-x-auto flex-nowrap"
          >
            <TabsTrigger
              v-for="sop in sops"
              :key="sop.id"
              :value="sop.id"
              class="text-xs px-3 h-7 whitespace-nowrap"
            >
              {{ sop.name }}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            v-for="sop in sops"
            :key="sop.id"
            :value="sop.id"
            class="flex-1 overflow-auto p-6 mt-0"
          >
            <div v-if="sopContent(sop)" :data-rule-context="sop.module_id">
              <SopViewer :sop-id="sop.id" :content="sopContent(sop) as SopContent" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DialogContent>
  </Dialog>
</template>
