<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { X } from '@lucide/vue'
import { useContentStore } from '@/stores/content'
import { useGameDataModalStore } from '@/stores/gameDataModal'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'
import MatrixTable from '@/components/game-data/MatrixTable.vue'
import AttributeTable from '@/components/game-data/AttributeTable.vue'
import ModifierList from '@/components/game-data/ModifierList.vue'
import type { MatrixContent } from '@/components/game-data/MatrixTable.vue'
import type { AttributeTableContent } from '@/components/game-data/AttributeTable.vue'
import type { ModifierListContent } from '@/components/game-data/ModifierList.vue'
import type { GameDatum } from '@/types/domain'

type TableContent = MatrixContent | AttributeTableContent | ModifierListContent

const contentStore = useContentStore()
const gameDataModalStore = useGameDataModalStore()

useModalShortcutGuard(() => gameDataModalStore.tableBrowserOpen)

// Tables are a union over the active set.
const tables = computed(() => contentStore.allGameData.filter((d) => d.type === 'table'))

const selectedTable = computed(
  (): GameDatum | null =>
    tables.value.find((t) => t.id === gameDataModalStore.selectedTableId) ?? null,
)

function tableContent(item: GameDatum): TableContent | null {
  return item.content as unknown as TableContent
}

function onOpenChange(open: boolean): void {
  if (!open) gameDataModalStore.closeTableBrowser()
}
</script>

<template>
  <Dialog :open="gameDataModalStore.tableBrowserOpen" @update:open="onOpenChange">
    <DialogContent
      :show-close-button="false"
      class="max-w-none sm:max-w-none w-full h-full top-0 left-0 translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col shadow-none"
    >
      <DialogTitle class="sr-only">Table Browser</DialogTitle>

      <div class="shrink-0 flex items-center justify-between h-12 px-4 border-b border-border">
        <span class="text-sm font-semibold text-foreground">Table Browser</span>
        <button
          class="flex items-center justify-center w-8 h-8 rounded hover:bg-muted/50 transition-colors"
          title="Close"
          @click="gameDataModalStore.closeTableBrowser()"
        >
          <X class="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <!-- Single-table renderer (opened by game-datum id). The table listing /
           bookmarks are added in Task 7; until then the shell shows a
           placeholder when no table is selected. -->
      <div class="flex-1 min-h-0 overflow-hidden flex flex-col">
        <template v-if="selectedTable">
          <div class="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border">
            <span class="text-sm font-semibold text-foreground">{{ selectedTable.name }}</span>
          </div>
          <div class="flex-1 overflow-auto p-6" :data-rule-context="selectedTable.module_id">
            <template v-if="tableContent(selectedTable)">
              <MatrixTable
                v-if="tableContent(selectedTable)!.kind === 'matrix'"
                :content="tableContent(selectedTable) as MatrixContent"
              />
              <AttributeTable
                v-else-if="tableContent(selectedTable)!.kind === 'attribute_table'"
                :content="tableContent(selectedTable) as AttributeTableContent"
              />
              <ModifierList
                v-else-if="tableContent(selectedTable)!.kind === 'modifier_list'"
                :content="tableContent(selectedTable) as ModifierListContent"
              />
            </template>
          </div>
        </template>
        <div
          v-else
          class="flex-1 flex items-center justify-center text-sm text-muted-foreground"
        >
          No table selected.
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
