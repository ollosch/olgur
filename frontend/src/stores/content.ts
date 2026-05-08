import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useSystemStore } from '@/stores/system'
import type { Rule, IndexEntry, Module, ApiCollection, ApiResource, UpdateRuleRequest, UpdateIndexEntryRequest } from '@/types/domain'

export const useContentStore = defineStore('content', () => {
  const { get, put, loading, errors } = useApi()
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

    // Calculate and assign depth to every rule in one depth-first pass.
    // Roots (parent_id === null) get depth 0; each child gets parent depth + 1.
    function assignDepths(rules: Rule[], depth: number): void {
      for (const rule of rules) {
        rule.depth = depth
        const children = m.get(rule.id)
        if (children) assignDepths(children, depth + 1)
      }
    }
    assignDepths(m.get(null) ?? [], 0)

    return m
  })

  /**
   * All rules for each module in depth-first traversal order.
   * Used for rule range calculations.
   */
  const flattenedRulesByModule = computed((): Map<string, Rule[]> => {
    const result = new Map<string, Rule[]>()
    const children = childrenMap.value

    for (const module of activeModules.value) {
      const moduleRules = rulesByModule.value[module.id] ?? []
      const roots = moduleRules.filter((r) => r.parent_id === null)
      const flattened: Rule[] = []

      function traverse(rules: Rule[]): void {
        for (const rule of rules) {
          flattened.push(rule)
          const ruleChildren = children.get(rule.id)
          if (ruleChildren) traverse(ruleChildren)
        }
      }

      traverse(roots)
      result.set(module.id, flattened)
    }

    return result
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

  /**
   * Set of index entry IDs that should be shown to the user.
   *
   * An entry is hidden when it has no meaningful content after filtering
   * rule_refs down to active-module rules only:
   *   – definition is blank
   *   – notes is blank/null
   *   – rule_refs (filtered to active rules) is empty
   *   – see_also is empty/null
   *
   * The check cascades upward: a parent that would otherwise be empty is kept
   * visible as long as at least one of its descendants is visible.
   */
  const visibleIndexEntryIds = computed((): Set<string> => {
    const ruleNums = rulesByNumber.value
    const childMap = indexEntriesByParent.value
    const memo = new Map<string, boolean>()

    function hasContent(entry: IndexEntry): boolean {
      const filteredRefs = (entry.relations?.rule_refs ?? []).filter((r) => ruleNums.has(r) || r.includes('-'))
      const seeAlso = entry.relations?.see_also ?? []
      return !!(entry.definition || entry.notes || filteredRefs.length > 0 || seeAlso.length > 0)
    }

    function isVisible(entry: IndexEntry): boolean {
      const cached = memo.get(entry.id)
      if (cached !== undefined) return cached
      // Set a temporary false to guard against circular parent→child refs (shouldn't exist, but be safe)
      memo.set(entry.id, false)
      const children = childMap.get(entry.id) ?? []
      const result = hasContent(entry) || children.some((c) => isVisible(c))
      memo.set(entry.id, result)
      return result
    }

    const visible = new Set<string>()
    for (const entry of allIndexEntries.value) {
      if (isVisible(entry)) visible.add(entry.id)
    }
    return visible
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

  async function updateRule(rule: Rule, data: UpdateRuleRequest): Promise<Rule | null> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return null

    const result = await put<ApiResource<Rule>, UpdateRuleRequest>(
      `/systems/${systemId}/modules/${rule.module_id}/rules/${rule.id}`,
      data,
    )

    if (result) {
      const list = rulesByModule.value[rule.module_id] ?? []
      const idx = list.indexOf(rulesById.value.get(rule.id)!)
      if (idx !== -1) list[idx] = result.data
      return result.data
    }

    return null
  }

  async function updateIndexEntry(entry: IndexEntry, data: UpdateIndexEntryRequest): Promise<IndexEntry | null> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return null

    const result = await put<ApiResource<IndexEntry>, UpdateIndexEntryRequest>(
      `/systems/${systemId}/modules/${entry.module_id}/index-entries/${entry.id}`,
      data,
    )

    if (result) {
      const list = indexEntriesByModule.value[entry.module_id] ?? []
      const idx = list.indexOf(indexEntriesById.value.get(entry.id)!)
      if (idx !== -1) list[idx] = result.data
      return result.data
    }

    return null
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
    errors,
    activeIds,
    activeModules,
    allRules,
    rulesById,
    rulesByNumber,
    childrenMap,
    flattenedRulesByModule,
    allIndexEntries,
    indexEntriesByTerm,
    indexEntriesById,
    indexEntriesByParent,
    visibleIndexEntryIds,
    fetchRules,
    updateRule,
    updateIndexEntry,
    fetchIndexEntries,
    fetchMissingModules,
    clear,
  }
})
