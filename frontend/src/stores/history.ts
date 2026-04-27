import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface HistoryEntry {
  type: 'rule' // extensible later: | 'table' | 'vehicle'
  id: string
  systemId: string
  title: string
  number: string
  viewedAt: Date
}

const MAX_HISTORY = 20

export const useHistoryStore = defineStore('history', () => {
  const entries = ref<HistoryEntry[]>([])

  /**
   * Add or move-to-top an entry. Called whenever the user opens an item.
   * If an entry with the same (type, id, systemId) exists, it is moved to the
   * front with an updated viewedAt. Otherwise prepended. Cap at MAX_HISTORY.
   */
  function record(entry: Omit<HistoryEntry, 'viewedAt'>): void {
    const filtered = entries.value.filter(
      (e) => !(e.type === entry.type && e.id === entry.id && e.systemId === entry.systemId),
    )
    filtered.unshift({ ...entry, viewedAt: new Date() })
    entries.value = filtered.slice(0, MAX_HISTORY)
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

  return { entries, record, clearSystem, forSystem }
})
