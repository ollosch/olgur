import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useApi } from '@/composables/useApi'
import type { BookmarkEntry, Membership, ApiResource } from '@/types/domain'

export const useBookmarkStore = defineStore('bookmarks', () => {
  const systemStore = useSystemStore()
  const { patch } = useApi()

  /** Current bookmarks from the active membership config */
  const bookmarks = computed((): BookmarkEntry[] =>
    systemStore.membership?.config?.bookmarks ?? [],
  )

  function isBookmarked(type: string, id: string): boolean {
    return bookmarks.value.some((b) => b.type === type && b.id === id)
  }

  async function addBookmark(type: 'rule', id: string): Promise<void> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return
    const existing = bookmarks.value
    if (existing.some((b) => b.type === type && b.id === id)) return
    const updated: BookmarkEntry[] = [...existing, { type, id }]
    await _patchConfig(systemId, updated)
  }

  async function removeBookmark(type: 'rule', id: string): Promise<void> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return
    const updated = bookmarks.value.filter((b) => !(b.type === type && b.id === id))
    await _patchConfig(systemId, updated)
  }

  async function _patchConfig(systemId: string, updatedBookmarks: BookmarkEntry[]): Promise<void> {
    const membership = systemStore.membership
    if (!membership) return

    const newConfig = {
      ...(membership.config ?? {}),
      bookmarks: updatedBookmarks,
    }

    const result = await patch<ApiResource<Membership>, { config: typeof newConfig }>(
      `/me/memberships/${systemId}`,
      { config: newConfig },
    )

    if (result) {
      systemStore.setMembership(systemId, result.data)
    }
  }

  return { bookmarks, isBookmarked, addBookmark, removeBookmark }
})
