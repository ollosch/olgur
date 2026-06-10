import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useContentStore } from '@/stores/content'
import { useApi } from '@/composables/useApi'
import type { BookmarkEntry, Membership, ApiResource } from '@/types/domain'

export interface ResolvedBookmark {
  entry: BookmarkEntry
  label: string
  sublabel: string | null
  sortKey: string
}

export const useBookmarkStore = defineStore('bookmarks', () => {
  const systemStore = useSystemStore()
  const membershipStore = useMembershipStore()
  const contentStore = useContentStore()
  const { patch } = useApi()

  /** Current bookmarks from the active membership config */
  const bookmarks = computed((): BookmarkEntry[] =>
    membershipStore.membership?.config?.bookmarks ?? [],
  )

  const resolvedBookmarks = computed((): ResolvedBookmark[] => {
    return bookmarks.value
      .map((b): ResolvedBookmark => {
        if (b.type === 'rule') {
          const rule = contentStore.rulesById.get(b.id)
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
    const membership = membershipStore.membership
    if (!membership) return

    const newConfig = {
      ...membership.config,
      bookmarks: updatedBookmarks,
    }

    const result = await patch<ApiResource<Membership>, { config: typeof newConfig }>(
      `/me/memberships/${systemId}`,
      { config: newConfig },
    )

    if (result.ok) {
      membershipStore.setMembership(systemId, result.data.data)
    }
  }

  return { bookmarks, resolvedBookmarks, isBookmarked, addBookmark, removeBookmark }
})
