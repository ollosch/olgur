import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useSystemStore } from '@/stores/system'
import type { Rule, IndexEntry, Module, ApiCollection } from '@/types/domain'

export const useContentStore = defineStore('content', () => {
  const { get, loading } = useApi()
  const systemStore = useSystemStore()

  const rulesByModule = ref<Record<string, Rule[]>>({})
  const indexEntriesByModule = ref<Record<string, IndexEntry[]>>({})

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const activeIds = computed((): string[] =>
    systemStore.membership?.config?.active_module_ids ?? [],
  )

  const activeModules = computed((): Module[] =>
    systemStore.modules.filter((m) => m.is_core || activeIds.value.includes(m.id)),
  )

  const allRules = computed((): Rule[] =>
    activeModules.value.flatMap((m) => rulesByModule.value[m.id] ?? []),
  )

  /** O(1) lookup by rule.id */
  const rulesById = computed((): Map<string, Rule> => {
    const m = new Map<string, Rule>()
    for (const r of allRules.value) m.set(r.id, r)
    return m
  })

  /** O(1) lookup by rule.number — used by delegation hover/click */
  const rulesByNumber = computed((): Map<string, Rule> => {
    const m = new Map<string, Rule>()
    for (const r of allRules.value) m.set(r.number, r)
    return m
  })

  /** Pre-sorted children lookup: parent_id (or null for roots) → Rule[] */
  const childrenMap = computed((): Map<string | null, Rule[]> => {
    const m = new Map<string | null, Rule[]>()
    for (const r of allRules.value) {
      const key = r.parent_id
      const bucket = m.get(key)
      if (bucket) {
        bucket.push(r)
      } else {
        m.set(key, [r])
      }
    }
    for (const bucket of m.values()) {
      bucket.sort((a, b) => a.sort_order - b.sort_order)
    }
    return m
  })

  const allIndexEntries = computed((): IndexEntry[] =>
    activeModules.value.flatMap((m) => indexEntriesByModule.value[m.id] ?? []),
  )

  /** O(1) lookup by indexEntry.term — used by delegation hover */
  const indexEntriesByTerm = computed((): Map<string, IndexEntry> => {
    const m = new Map<string, IndexEntry>()
    for (const e of allIndexEntries.value) m.set(e.term, e)
    return m
  })

  /** O(1) lookup by indexEntry.id */
  const indexEntriesById = computed((): Map<string, IndexEntry> => {
    const m = new Map<string, IndexEntry>()
    for (const e of allIndexEntries.value) m.set(e.id, e)
    return m
  })

  /** O(1) children lookup: parent_id (or null for roots) → IndexEntry[] */
  const indexEntriesByParent = computed((): Map<string | null, IndexEntry[]> => {
    const m = new Map<string | null, IndexEntry[]>()
    for (const e of allIndexEntries.value) {
      const key = e.parent_id
      const bucket = m.get(key)
      if (bucket) {
        bucket.push(e)
      } else {
        m.set(key, [e])
      }
    }
    return m
  })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function fetchRules(moduleId: string): Promise<void> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return

    const result = await get<ApiCollection<Rule>>(`/systems/${systemId}/modules/${moduleId}/rules`)
    if (result) {
      rulesByModule.value[moduleId] = result.data
    }
  }

  async function fetchIndexEntries(moduleId: string): Promise<void> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return

    const result = await get<ApiCollection<IndexEntry>>(
      `/systems/${systemId}/modules/${moduleId}/index-entries`,
    )
    if (result) {
      indexEntriesByModule.value[moduleId] = result.data
    }
  }

  /**
   * Fetch rules + index entries for any active non-core modules not yet loaded.
   * Returns the modules that were fetched so callers can react (e.g. expand panel).
   */
  async function fetchMissingModules(): Promise<Module[]> {
    const toLoad = systemStore.modules.filter(
      (m) => !m.is_core && activeIds.value.includes(m.id) && !rulesByModule.value[m.id],
    )
    if (toLoad.length === 0) return []
    await Promise.all([
      ...toLoad.map((m) => fetchRules(m.id)),
      ...toLoad.map((m) => fetchIndexEntries(m.id)),
    ])
    return toLoad
  }

  function clear(): void {
    rulesByModule.value = {}
    indexEntriesByModule.value = {}
  }

  return {
    rulesByModule,
    indexEntriesByModule,
    loading,
    activeIds,
    activeModules,
    allRules,
    rulesById,
    rulesByNumber,
    childrenMap,
    allIndexEntries,
    indexEntriesByTerm,
    indexEntriesById,
    indexEntriesByParent,
    fetchRules,
    fetchIndexEntries,
    fetchMissingModules,
    clear,
  }
})
