import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useContentStore } from '@/stores/content'
import { useApi } from '@/composables/useApi'
import type { BookmarkEntry, GameDatum, Membership, ApiResource } from '@/types/domain'

export interface ResolvedBookmark {
  entry: BookmarkEntry
  label: string
  sublabel: string | null
  sortKey: string
  available: boolean
}

const UNAVAILABLE_LABEL = 'Unavailable bookmark'

export const useBookmarkStore = defineStore('bookmarks', () => {
  const systemStore = useSystemStore()
  const membershipStore = useMembershipStore()
  const contentStore = useContentStore()
  const { patch } = useApi()

  /** Current bookmarks from the active membership config */
  const bookmarks = computed(
    (): BookmarkEntry[] => membershipStore.membership?.config?.bookmarks ?? [],
  )

  /** O(1) lookup by game-datum id — used to resolve table/unit bookmark labels. */
  const gameDataById = computed((): Map<string, GameDatum> => {
    const m = new Map<string, GameDatum>()
    for (const d of contentStore.allGameData) m.set(d.id, d)
    return m
  })

  const resolvedBookmarks = computed((): ResolvedBookmark[] => {
    return bookmarks.value
      .map((b): ResolvedBookmark => {
        if (b.type === 'rule') {
          const rule = contentStore.rulesById.get(b.id)
          if (!rule) {
            return {
              entry: b,
              label: UNAVAILABLE_LABEL,
              sublabel: null,
              sortKey: UNAVAILABLE_LABEL,
              available: false,
            }
          }
          return {
            entry: b,
            label: `${rule.number} ${rule.title}`,
            sublabel: rule.number,
            sortKey: rule.number,
            available: true,
          }
        }
        const datum = gameDataById.value.get(b.id)
        if (!datum) {
          return {
            entry: b,
            label: UNAVAILABLE_LABEL,
            sublabel: null,
            sortKey: UNAVAILABLE_LABEL,
            available: false,
          }
        }
        return {
          entry: b,
          label: datum.name,
          sublabel: null,
          sortKey: datum.name,
          available: true,
        }
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  })

  /** Bookmarks whose target resolves in the currently loaded content source. */
  const availableBookmarks = computed((): ResolvedBookmark[] =>
    resolvedBookmarks.value.filter((b) => b.available),
  )

  function isBookmarked(type: string, id: string): boolean {
    return bookmarks.value.some((b) => b.type === type && b.id === id)
  }

  function targetModuleId(type: BookmarkEntry['type'], id: string): string | null {
    if (type === 'rule') return contentStore.rulesById.get(id)?.module_id ?? null
    return gameDataById.value.get(id)?.module_id ?? null
  }

  async function addBookmark(type: BookmarkEntry['type'], id: string): Promise<void> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return
    const existing = bookmarks.value
    if (existing.some((b) => b.type === type && b.id === id)) return

    const entry: BookmarkEntry = { type, id }
    if (!contentStore.isBookmarkTargetAvailable(entry)) return
    const moduleId = targetModuleId(type, id)
    if (!moduleId || contentStore.usesLiveContent(moduleId)) return

    const updated: BookmarkEntry[] = [...existing, entry]
    await _patchConfig(systemId, updated)
  }

  async function removeBookmark(type: BookmarkEntry['type'], id: string): Promise<void> {
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

  return {
    bookmarks,
    resolvedBookmarks,
    availableBookmarks,
    isBookmarked,
    addBookmark,
    removeBookmark,
  }
})
