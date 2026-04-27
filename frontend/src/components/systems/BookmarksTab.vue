<script setup lang="ts">
import { computed } from 'vue'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useBookmarkStore } from '@/stores/bookmarks'
import { useContentStore } from '@/stores/content'
import { useSystemNavStore } from '@/stores/systemNav'
import { useLeftPanelStore } from '@/stores/leftPanel'
import type { BookmarkEntry } from '@/types/domain'

const bookmarkStore = useBookmarkStore()
const contentStore = useContentStore()
const navStore = useSystemNavStore()
const panelStore = useLeftPanelStore()

interface ResolvedBookmark {
  entry: BookmarkEntry
  label: string
  sublabel: string | null
  sortKey: string
}

const resolvedBookmarks = computed((): ResolvedBookmark[] => {
  return bookmarkStore.bookmarks
    .map((b): ResolvedBookmark => {
      if (b.type === 'rule') {
        const allRules = Object.values(contentStore.rulesByModule).flat()
        const rule = allRules.find((r) => r.id === b.id)
        return {
          entry: b,
          label: rule ? `${rule.number} ${rule.title}` : b.id,
          sublabel: rule ? rule.number : null,
          sortKey: rule ? rule.number : b.id,
        }
      }
      return {
        entry: b,
        label: b.id,
        sublabel: null,
        sortKey: b.id,
      }
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
})

function navigate(bookmark: ResolvedBookmark) {
  if (bookmark.entry.type === 'rule') {
    navStore.navigate({ view: 'rule', ruleId: bookmark.entry.id })
    panelStore.mobileOpen = false
  }
}
</script>

<template>
  <ScrollArea class="h-full">
    <div class="py-2">
      <!-- Empty state -->
      <div
        v-if="resolvedBookmarks.length === 0"
        class="px-4 py-4 text-xs text-muted-foreground text-center"
      >
        No bookmarks yet.
      </div>

      <!-- Bookmark list -->
      <button
        v-for="bookmark in resolvedBookmarks"
        :key="bookmark.entry.id"
        class="w-full flex items-baseline gap-2 px-4 py-2 hover:bg-muted/30 transition-colors text-left"
        @click="navigate(bookmark)"
      >
        <span
          v-if="bookmark.sublabel"
          class="font-mono text-xs text-primary font-semibold shrink-0 w-12 text-right"
        >
          {{ bookmark.sublabel }}
        </span>
        <span class="text-xs text-foreground/80 truncate">{{ bookmark.label.replace(bookmark.sublabel ? bookmark.sublabel + ' ' : '', '') }}</span>
      </button>
    </div>
  </ScrollArea>
</template>
