<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useBookmarkStore } from '@/stores/bookmarks'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { useContentStore } from '@/stores/content'
import { useGameDataModalStore } from '@/stores/gameDataModal'
import { useUnitSelectionStore } from '@/stores/unitSelection'
import { useToolModalStore } from '@/stores/toolModal'
import { FEATURES, resolveToolType } from '@/lib/features'
import { X } from '@lucide/vue'
import type { ResolvedBookmark } from '@/stores/bookmarks'

const bookmarkStore = useBookmarkStore()
const panelStore = useLeftPanelStore()
const contentStore = useContentStore()
const gameDataModalStore = useGameDataModalStore()
const unitSelectionStore = useUnitSelectionStore()
const toolModalStore = useToolModalStore()
const router = useRouter()
const route = useRoute()

function navigate(bookmark: ResolvedBookmark): void {
  if (!bookmark.available) return
  const systemId = route.params['systemId'] as string

  if (bookmark.entry.type === 'rule') {
    router.push({ name: 'system-rule', params: { systemId, ruleId: bookmark.entry.id } })
    panelStore.mobileOpen = false
    return
  }

  if (bookmark.entry.type === 'table') {
    gameDataModalStore.selectTable(bookmark.entry.id)
    panelStore.mobileOpen = false
    return
  }

  const unit = contentStore.gameDataById.get(bookmark.entry.id)
  if (unit) {
    unitSelectionStore.selectUnit(unit)
    toolModalStore.open(resolveToolType(unit.type, FEATURES.afvVsAfv))
    panelStore.mobileOpen = false
  }
}
</script>

<template>
  <ScrollArea class="h-full">
    <div class="py-2">
      <!-- Empty state -->
      <div
        v-if="bookmarkStore.resolvedBookmarks.length === 0"
        class="px-4 py-4 text-xs text-muted-foreground text-center"
      >
        No bookmarks yet.
      </div>

      <!-- Bookmark list -->
      <div
        v-for="bookmark in bookmarkStore.resolvedBookmarks"
        :key="`${bookmark.entry.type}:${bookmark.entry.id}`"
        class="w-full flex items-center gap-1 px-2 py-1.5 hover:bg-muted/30 transition-colors group"
        :class="{ 'opacity-60': !bookmark.available }"
      >
        <button
          class="flex items-baseline gap-2 flex-1 min-w-0 text-left disabled:cursor-not-allowed"
          :disabled="!bookmark.available"
          :title="bookmark.available ? undefined : 'Unavailable bookmark'"
          @click="navigate(bookmark)"
        >
          <span
            v-if="bookmark.sublabel"
            class="font-mono text-xs text-primary font-semibold shrink-0 w-12 text-right"
          >
            {{ bookmark.sublabel }}
          </span>
          <span
            class="text-xs truncate"
            :class="bookmark.available ? 'text-foreground/80' : 'text-muted-foreground italic'"
            >{{
              bookmark.label.replace(bookmark.sublabel ? bookmark.sublabel + ' ' : '', '')
            }}</span
          >
        </button>
        <button
          class="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
          :title="`Remove bookmark`"
          @click.stop="
            bookmarkStore.removeBookmark(bookmark.entry.type, bookmark.entry.id)
          "
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    </div>
  </ScrollArea>
</template>
