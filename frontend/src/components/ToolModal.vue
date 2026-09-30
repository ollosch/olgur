<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { X } from '@lucide/vue'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { useToolModalStore } from '@/stores/toolModal'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'
import { gameDataTools } from '@/lib/gameDataTools'

const toolModalStore = useToolModalStore()
const contentStore = useContentStore()
const systemStore = useSystemStore()

useModalShortcutGuard(() => toolModalStore.isOpen)

const tools = computed(() =>
  gameDataTools(contentStore.allGameData, systemStore.currentSystem?.slug),
)

const activeTool = computed(
  () => tools.value.find((t) => t.id === toolModalStore.activeToolId) ?? null,
)

function onOpenChange(open: boolean): void {
  if (!open) toolModalStore.close()
}
</script>

<template>
  <!-- Keep content mounted while hidden so the active tool and its internal
       store-backed state (unit browser search/filter/selection, scroll) survive
       open → close → open. -->
  <Dialog :open="toolModalStore.isOpen" :unmount-on-hide="false" @update:open="onOpenChange">
    <DialogContent
      :show-close-button="false"
      class="max-w-none sm:max-w-none w-full h-full top-0 left-0 translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col shadow-none"
    >
      <DialogTitle class="sr-only">{{ activeTool?.label ?? 'Tool' }}</DialogTitle>

      <div class="shrink-0 flex items-center justify-between h-12 px-4 border-b border-border">
        <span class="text-sm font-semibold text-foreground">{{ activeTool?.label }}</span>
        <button
          class="flex items-center justify-center w-8 h-8 rounded hover:bg-muted/50 transition-colors"
          title="Close"
          @click="toolModalStore.close()"
        >
          <X class="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div class="flex-1 min-h-0 overflow-hidden">
        <component :is="activeTool.component" v-if="activeTool" />
      </div>
    </DialogContent>
  </Dialog>
</template>
