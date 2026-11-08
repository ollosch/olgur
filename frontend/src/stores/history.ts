import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSystemStore } from '@/stores/system'
import type { ContentMode } from '@/types/domain'

export interface HistoryEntry {
  type: 'rule' // extensible later: | 'table' | 'vehicle'
  id: string
  systemId: string
  mode: ContentMode
  title: string
  number: string
  viewedAt: Date
}

const MAX_HISTORY = 20

export const useHistoryStore = defineStore('history', () => {
  const systemStore = useSystemStore()
  const entries = ref<HistoryEntry[]>([])

  /**
   * Add or move-to-top an entry. Draft and released views keep separate
   * lists, so uniqueness includes the content mode. Each list is capped at
   * MAX_HISTORY entries.
   */
  function record(entry: Omit<HistoryEntry, 'viewedAt'>): void {
    const filtered = entries.value.filter(
      (e) =>
        !(
          e.type === entry.type &&
          e.id === entry.id &&
          e.systemId === entry.systemId &&
          e.mode === entry.mode
        ),
    )
    const next = [{ ...entry, viewedAt: new Date() }, ...filtered]

    const counts: Record<ContentMode, number> = { draft: 0, release: 0 }
    entries.value = next.filter((e) => {
      counts[e.mode] += 1
      return counts[e.mode] <= MAX_HISTORY
    })
  }

  /**
   * Clear all history for a given system (call on system exit).
   */
  function clearSystem(systemId: string): void {
    entries.value = entries.value.filter((e) => e.systemId !== systemId)
  }

  /**
   * Returns history entries for the given system, already ordered newest first.
   */
  function forSystem(systemId: string): HistoryEntry[] {
    return entries.value.filter((e) => e.systemId === systemId)
  }

  /** History entries for the currently active system, newest first. */
  const currentSystemEntries = computed((): HistoryEntry[] => {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return []
    return forSystem(systemId)
  })

  return {
    entries,
    record,
    clearSystem,
    forSystem,
    currentSystemEntries,
  }
})
