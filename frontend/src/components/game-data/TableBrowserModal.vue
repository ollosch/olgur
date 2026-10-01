<script setup lang="ts">
import { computed, ref } from 'vue'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { X, Bookmark, Search } from '@lucide/vue'
import { useContentStore } from '@/stores/content'
import { useGameDataModalStore } from '@/stores/gameDataModal'
import { useBookmarkStore } from '@/stores/bookmarks'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'
import MatrixTable from '@/components/game-data/MatrixTable.vue'
import AttributeTable from '@/components/game-data/AttributeTable.vue'
import ModifierList from '@/components/game-data/ModifierList.vue'
import IftTable from '@/components/game-data/asl/IftTable.vue'
import CctTable from '@/components/game-data/asl/CctTable.vue'
import LeaderCreationTable from '@/components/game-data/asl/LeaderCreationTable.vue'
import ToHitTable from '@/components/game-data/asl/ToHitTable.vue'
import ToKillTable from '@/components/game-data/asl/ToKillTable.vue'
import DestructionTable from '@/components/game-data/asl/DestructionTable.vue'
import type { MatrixContent } from '@/components/game-data/MatrixTable.vue'
import type { AttributeTableContent } from '@/components/game-data/AttributeTable.vue'
import type { ModifierListContent } from '@/components/game-data/ModifierList.vue'
import type { IftContent } from '@/components/game-data/asl/IftTable.vue'
import type { CctContent } from '@/components/game-data/asl/CctTable.vue'
import type { LeaderCreationContent } from '@/components/game-data/asl/LeaderCreationTable.vue'
import type { ToHitContent } from '@/components/game-data/asl/ToHitTable.vue'
import type { ToKillContent } from '@/components/game-data/asl/ToKillTable.vue'
import type { DestructionContent } from '@/components/game-data/asl/DestructionTable.vue'
import type { GameDatum } from '@/types/domain'

type TableContent =
  | MatrixContent
  | AttributeTableContent
  | ModifierListContent
  | IftContent
  | CctContent
  | LeaderCreationContent
  | ToHitContent
  | ToKillContent
  | DestructionContent

const contentStore = useContentStore()
const gameDataModalStore = useGameDataModalStore()
const bookmarkStore = useBookmarkStore()

useModalShortcutGuard(() => gameDataModalStore.tableBrowserOpen)

// Tables are a union over the active set.
const tables = computed(() => contentStore.allGameData.filter((d) => d.type === 'table'))

const searchQuery = ref('')

const filteredTables = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return tables.value
  return tables.value.filter((t) => t.name.toLowerCase().includes(q))
})

const selectedTable = computed(
  (): GameDatum | null =>
    tables.value.find((t) => t.id === gameDataModalStore.selectedTableId) ?? null,
)

function tableContent(item: GameDatum): TableContent | null {
  return item.content as unknown as TableContent
}

function isPinned(tableId: string): boolean {
  return bookmarkStore.isBookmarked('table', tableId)
}

function togglePin(table: GameDatum): void {
  if (isPinned(table.id)) {
    void bookmarkStore.removeBookmark('table', table.id)
  } else {
    void bookmarkStore.addBookmark('table', table.id)
  }
}

function onOpenChange(open: boolean): void {
  if (!open) gameDataModalStore.closeTableBrowser()
}
</script>

<template>
  <!-- Keep content mounted while hidden so the selected table and scroll position
       survive open → close → open. -->
  <Dialog
    :open="gameDataModalStore.tableBrowserOpen"
    :unmount-on-hide="false"
    @update:open="onOpenChange"
  >
    <DialogContent
      :show-close-button="false"
      class="max-w-none sm:max-w-none w-full h-full top-0 left-0 translate-x-0 translate-y-0 rounded-none border-0 p-0 gap-0 flex flex-col shadow-none"
    >
      <DialogTitle class="sr-only">Table Browser</DialogTitle>
      <DialogDescription class="sr-only">Browse and inspect game tables</DialogDescription>

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

      <!-- Table listing + single-table renderer. The listing is always
           visible; clicking a table selects it, and each row has a pin/unpin
           control backed by the polymorphic bookmark store. -->
      <div class="flex-1 min-h-0 min-w-0 flex">
        <!-- Browsable table list -->
        <aside
          class="w-72 shrink-0 border-r border-border flex flex-col"
          data-test="table-list"
        >
          <div class="shrink-0 p-2 border-b border-border">
            <div
              class="flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5"
            >
              <Search class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search tables…"
                autocomplete="off"
                data-test="table-search"
                class="flex-1 min-w-0 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto">
            <div
              v-if="filteredTables.length === 0"
              class="px-4 py-4 text-sm text-muted-foreground"
            >
              {{ tables.length === 0 ? 'No tables available.' : 'No tables match your search.' }}
            </div>
            <div v-else class="py-2">
              <div
                v-for="table in filteredTables"
                :key="table.id"
                class="flex items-center gap-1 px-2 py-0.5 hover:bg-muted/30 transition-colors group"
                :class="table.id === gameDataModalStore.selectedTableId ? 'bg-muted/50' : ''"
              >
                <button
                  class="flex-1 min-w-0 text-left px-2 py-1.5 rounded text-sm text-foreground/90 hover:text-foreground transition-colors"
                  :data-table-id="table.id"
                  @click="gameDataModalStore.selectTable(table.id)"
                >
                  <span class="truncate block">{{ table.name }}</span>
                </button>
                <button
                  class="shrink-0 p-1.5 rounded hover:bg-muted/50 transition-colors"
                  :title="isPinned(table.id) ? 'Unpin table' : 'Pin table'"
                  :data-pin="table.id"
                  @click.stop="togglePin(table)"
                >
                  <Bookmark
                    class="w-3.5 h-3.5 transition-colors"
                    :class="
                      isPinned(table.id)
                        ? 'text-primary fill-primary'
                        : 'text-muted-foreground'
                    "
                  />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <!-- Single-table renderer -->
        <div class="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
          <template v-if="selectedTable">
            <div class="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border">
              <span class="text-sm font-semibold text-foreground">{{ selectedTable.name }}</span>
            </div>
            <div
              class="flex-1 min-w-0 overflow-auto p-6"
              data-test="table-render-area"
              :data-rule-context="selectedTable.module_id"
            >
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
                <IftTable
                  v-else-if="tableContent(selectedTable)!.kind === 'ift'"
                  :content="tableContent(selectedTable) as IftContent"
                />
                <CctTable
                  v-else-if="tableContent(selectedTable)!.kind === 'cct'"
                  :content="tableContent(selectedTable) as CctContent"
                />
                <LeaderCreationTable
                  v-else-if="tableContent(selectedTable)!.kind === 'leader_creation'"
                  :content="tableContent(selectedTable) as LeaderCreationContent"
                />
                <ToHitTable
                  v-else-if="tableContent(selectedTable)!.kind === 'to_hit'"
                  :content="tableContent(selectedTable) as ToHitContent"
                />
                <ToKillTable
                  v-else-if="tableContent(selectedTable)!.kind === 'to_kill'"
                  :content="tableContent(selectedTable) as ToKillContent"
                />
                <DestructionTable
                  v-else-if="tableContent(selectedTable)!.kind === 'destruction'"
                  :content="tableContent(selectedTable) as DestructionContent"
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
      </div>
    </DialogContent>
  </Dialog>
</template>
