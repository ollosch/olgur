import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useContentStore } from '@/stores/content'
import { useApi } from '@/composables/useApi'
import { FEATURES, isTableVisible } from '@/lib/features'
import type {
  BookmarkEntry,
  ContentMode,
  GameDatum,
  Membership,
  Rule,
  ApiResource,
} from '@/types/domain'

export interface ResolvedBookmark {
  entry: BookmarkEntry
  mode: ContentMode
  label: string
  sublabel: string | null
  sortKey: string
  available: boolean
  isCurrentMode: boolean
}

const UNAVAILABLE_LABEL = 'Unavailable bookmark'

function modeOf(entry: BookmarkEntry): ContentMode {
  return entry.mode ?? 'release'
}

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

  function targetFor(entry: Pick<BookmarkEntry, 'type' | 'id'>): Rule | GameDatum | undefined {
    return entry.type === 'rule'
      ? contentStore.rulesById.get(entry.id)
      : gameDataById.value.get(entry.id)
  }

  function labelParts(
    entry: BookmarkEntry,
    target: Rule | GameDatum | undefined,
  ): {
    label: string
    sublabel: string | null
  } {
    if (target && entry.type === 'rule') {
      const rule = target as Rule
      return { label: `${rule.number} ${rule.title}`, sublabel: rule.number }
    }

    if (target) {
      return { label: (target as GameDatum).name, sublabel: null }
    }

    if (entry.label) {
      return { label: entry.label, sublabel: entry.sublabel ?? null }
    }

    return { label: UNAVAILABLE_LABEL, sublabel: null }
  }

  const resolvedBookmarks = computed((): ResolvedBookmark[] => {
    const resolved = bookmarks.value
      .map((entry): ResolvedBookmark => {
        const target = targetFor(entry)
        const mode = modeOf(entry)
        const currentMode = target
          ? contentStore.contentModeFor(target.module_id)
          : contentStore.effectiveViewMode
        const isCurrentMode = mode === currentMode
        const available = isCurrentMode ? target !== undefined : true
        const { label, sublabel } = labelParts(entry, target)

        return {
          entry,
          mode,
          label,
          sublabel,
          sortKey: sublabel ?? label,
          available,
          isCurrentMode,
        }
      })
      .filter((bookmark) => {
        if (bookmark.entry.type !== 'table') return true
        const datum = gameDataById.value.get(bookmark.entry.id)
        return !datum || isTableVisible(datum, FEATURES.aslTables)
      })

    return resolved.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  })

  /**
   * Bookmarks whose target resolves in the content source currently displayed.
   * Used by the toolbar, which never mixes draft and release.
   */
  const availableBookmarks = computed((): ResolvedBookmark[] =>
    resolvedBookmarks.value.filter((b) => b.isCurrentMode && b.available),
  )

  function isBookmarked(type: BookmarkEntry['type'], id: string, mode: ContentMode): boolean {
    return bookmarks.value.some((b) => b.type === type && b.id === id && modeOf(b) === mode)
  }

  function targetModuleId(type: BookmarkEntry['type'], id: string): string | null {
    if (type === 'rule') return contentStore.rulesById.get(id)?.module_id ?? null
    return gameDataById.value.get(id)?.module_id ?? null
  }

  async function addBookmark(type: BookmarkEntry['type'], id: string): Promise<void> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return

    const target = targetFor({ type, id })
    const moduleId = targetModuleId(type, id)
    if (!target || !moduleId) return

    const mode = contentStore.contentModeFor(moduleId)
    if (bookmarks.value.some((b) => b.type === type && b.id === id && modeOf(b) === mode)) return

    const { label, sublabel } = labelParts({ type, id }, target)
    const entry: BookmarkEntry = { type, id, mode, label, sublabel }

    const updated: BookmarkEntry[] = [...bookmarks.value, entry]
    await _patchConfig(systemId, updated)
  }

  async function removeBookmark(
    type: BookmarkEntry['type'],
    id: string,
    mode: ContentMode,
  ): Promise<void> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return
    const updated = bookmarks.value.filter(
      (b) => !(b.type === type && b.id === id && modeOf(b) === mode),
    )
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
