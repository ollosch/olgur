import { ref, computed, markRaw, type ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { request } from '@/lib/http'
import type { ApiResult } from '@/lib/http'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import type {
  Rule,
  IndexEntry,
  Module,
  ModulePermissions,
  GameDatum,
  ManifestEntry,
  ApiCollection,
  ApiResource,
  UpdateRuleRequest,
  UpdateIndexEntryRequest,
} from '@/types/domain'

export const useContentStore = defineStore('content', () => {
  const { get, put, loading } = useApi()
  const systemStore = useSystemStore()
  const membershipStore = useMembershipStore()

  const rulesByModule = ref<Record<string, Rule[]>>({})
  const indexEntriesByModule = ref<Record<string, IndexEntry[]>>({})
  const gameDataByModule = ref<Record<string, GameDatum[]>>({})
  const manifestByModule = ref<Record<string, ManifestEntry>>({})

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const activeIds = computed(
    (): string[] => membershipStore.membership?.config?.active_module_ids ?? [],
  )

  const activeModules = computed((): Module[] =>
    systemStore.modules.filter((m) => m.is_core || activeIds.value.includes(m.id)),
  )

  /**
   * The current user's permission map for the given module, as supplied by the
   * API. Falls back to null when the module (or its permissions) are unknown.
   */
  function permissionsFor(moduleId: string): ModulePermissions | null {
    return systemStore.modules.find((m) => m.id === moduleId)?.permissions ?? null
  }

  /**
   * Whether the current user reads this module's live draft content.
   * Editors and system admins read live; everyone else reads released content.
   */
  function canViewLive(moduleId: string): boolean {
    return permissionsFor(moduleId)?.['content.view_live'] ?? false
  }

  /**
   * Whether the current user can read this module's latest released snapshot.
   */
  function canViewReleased(moduleId: string): boolean {
    return permissionsFor(moduleId)?.['content.view_released'] ?? false
  }

  function isUnavailable(moduleId: string): boolean {
    return !canViewLive(moduleId) && !canViewReleased(moduleId)
  }

  /**
   * Whether the current user can edit this module's content.
   */
  function canEditModule(moduleId: string): boolean {
    return permissionsFor(moduleId)?.['content.edit'] ?? false
  }

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

  /** O(1) lookup of active modules by id. */
  const moduleById = computed((): Map<string, Module> => {
    const m = new Map<string, Module>()
    for (const mod of activeModules.value) m.set(mod.id, mod)
    return m
  })

  /** O(1) lookup of active modules by slug — used for `{{L:module-slug:number}}` links. */
  const moduleBySlug = computed((): Map<string, Module> => {
    const m = new Map<string, Module>()
    for (const mod of activeModules.value) m.set(mod.slug, mod)
    return m
  })

  /** Module-scoped rule lookup: module_id → (rule.number → rule). */
  const rulesByModuleNumber = computed((): Map<string, Map<string, Rule>> => {
    const m = new Map<string, Map<string, Rule>>()
    for (const mod of activeModules.value) {
      const inner = new Map<string, Rule>()
      for (const r of rulesByModule.value[mod.id] ?? []) inner.set(r.number, r)
      m.set(mod.id, inner)
    }
    return m
  })

  const systemStructure = computed(
    (): string => systemStore.currentSystem?.config?.system_structure ?? 'grouping_only',
  )

  /**
   * Resolve a rule reference to a rule.
   *
   * An explicit module-slug link (`{{L:core:3.4}}`) resolves in that module in
   * every structure mode. A bare link (`{{L:1.2}}`) resolves system-wide when
   * rule numbers are system-wide unique (`core_plus_many`), otherwise it
   * resolves in the current module context supplied by the rendering surface.
   */
  function resolveRuleReference(
    number: string,
    opts?: { moduleSlug?: string; contextModuleId?: string },
  ): Rule | null {
    if (opts?.moduleSlug) {
      const mod = moduleBySlug.value.get(opts.moduleSlug)
      if (!mod) return null
      return rulesByModuleNumber.value.get(mod.id)?.get(number) ?? null
    }

    if (systemStructure.value === 'core_plus_many') {
      return rulesByNumber.value.get(number) ?? null
    }

    const moduleId = opts?.contextModuleId
    if (!moduleId) return null
    return rulesByModuleNumber.value.get(moduleId)?.get(number) ?? null
  }

  /**
   * Whether the given rule reference resolves for the given entry's module.
   * Ranges are always considered resolvable; a bare number must match a rule in
   * the entry's module (or system-wide for `core_plus_many`).
   */
  function hasRuleReference(ref: string, moduleId: string): boolean {
    if (ref.includes('-')) return true
    if (systemStructure.value === 'core_plus_many') return rulesByNumber.value.has(ref)
    return rulesByModuleNumber.value.get(moduleId)?.has(ref) ?? false
  }

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

  /** Map of rule_id → depth (roots = 0). Computed via depth-first traversal over childrenMap. */
  const ruleDepths: ComputedRef<Map<string, number>> = computed((): Map<string, number> => {
    const depths = new Map<string, number>()
    const children = childrenMap.value

    function assignDepths(rules: Rule[], depth: number): void {
      for (const rule of rules) {
        depths.set(rule.id, depth)
        const ruleChildren = children.get(rule.id)
        if (ruleChildren) assignDepths(ruleChildren, depth + 1)
      }
    }
    assignDepths(children.get(null) ?? [], 0)

    return depths
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

  const allGameData = computed((): GameDatum[] =>
    activeModules.value.flatMap((m) => gameDataByModule.value[m.id] ?? []),
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
    const childMap = indexEntriesByParent.value
    const memo = new Map<string, boolean>()

    function hasContent(entry: IndexEntry): boolean {
      const filteredRefs = (entry.relations?.rule_refs ?? []).filter((r) =>
        hasRuleReference(r, entry.module_id),
      )
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

  /**
   * Fetch the versioned manifest for the given system and store entries keyed
   * by module_id.  Always called on system entry so the manifest is ready
   * before any content fetches.
   */
  async function fetchManifest(systemId: string): Promise<void> {
    // The backend returns { data: { system_id, name, modules: ManifestEntry[] } }
    // `useApi()` returns `res.data` as `result.data`, so modules live at
    // result.data.data.modules.
    const result = await get<
      ApiResource<{ system_id: string; name?: string; modules?: ManifestEntry[] }>
    >(`/systems/${systemId}/manifest`)
    if (result.ok) {
      const map: Record<string, ManifestEntry> = {}
      // Support two response shapes used in tests and different backends:
      //  - { data: { modules: ManifestEntry[] } }
      //  - { data: [ ManifestEntry, ... ] }
      const payload = result.data?.data
      const modules: ManifestEntry[] = Array.isArray(payload) ? payload : (payload?.modules ?? [])
      for (const entry of modules) {
        map[entry.module_id] = entry
      }
      manifestByModule.value = map
    }
  }

  /**
   * Fetch a JSON collection from an absolute URL using the authenticated axios
   * instance.  Cookies and XSRF token are sent automatically.
   * Returns null on any error so callers can skip gracefully.
   */
  async function fetchAuthenticatedCollection<T>(url: string): Promise<T[] | null> {
    try {
      const json = await request<T[]>({ method: 'GET', url })
      return Array.isArray(json) ? json : null
    } catch {
      return null
    }
  }

  async function fetchRules(systemId: string, moduleId: string): Promise<void> {
    if (canViewLive(moduleId)) {
      const result = await get<ApiCollection<Rule>>(
        `/systems/${systemId}/modules/${moduleId}/rules`,
      )
      if (result.ok) {
        rulesByModule.value[moduleId] = result.data.data.map((r) =>
          markRaw({ ...r, content: r.content.split('<br>').join('\n') }),
        )
      }
      return
    }

    if (canViewReleased(moduleId)) {
      const manifestEntry = manifestByModule.value[moduleId]
      if (!manifestEntry) return
      const data = await fetchAuthenticatedCollection<Rule>(manifestEntry.content.rules)
      if (data !== null) {
        rulesByModule.value[moduleId] = data.map((r) =>
          markRaw({ ...r, content: r.content.split('<br>').join('\n') }),
        )
      }
    }
  }

  async function updateRule(
    systemId: string,
    rule: Rule,
    data: UpdateRuleRequest,
  ): Promise<ApiResult<Rule>> {
    const result = await put<ApiResource<Rule>, UpdateRuleRequest>(
      `/systems/${systemId}/modules/${rule.module_id}/rules/${rule.id}`,
      { ...data, content: data.content.split('\n').join('<br>') },
    )

    if (result.ok) {
      const stored = markRaw({
        ...result.data.data,
        content: result.data.data.content.split('<br>').join('\n'),
      })
      const list = rulesByModule.value[rule.module_id] ?? []
      const idx = list.indexOf(rulesById.value.get(rule.id)!)
      if (idx !== -1) list[idx] = stored
      return { ok: true, data: stored }
    }

    return result
  }

  async function updateIndexEntry(
    systemId: string,
    entry: IndexEntry,
    data: UpdateIndexEntryRequest,
  ): Promise<ApiResult<IndexEntry>> {
    const result = await put<ApiResource<IndexEntry>, UpdateIndexEntryRequest>(
      `/systems/${systemId}/modules/${entry.module_id}/index-entries/${entry.id}`,
      data,
    )

    if (result.ok) {
      const list = indexEntriesByModule.value[entry.module_id] ?? []
      const idx = list.indexOf(indexEntriesById.value.get(entry.id)!)
      if (idx !== -1) list[idx] = markRaw(result.data.data)
      return { ok: true, data: result.data.data }
    }

    return result
  }

  async function fetchIndexEntries(systemId: string, moduleId: string): Promise<void> {
    if (canViewLive(moduleId)) {
      const result = await get<ApiCollection<IndexEntry>>(
        `/systems/${systemId}/modules/${moduleId}/index-entries`,
      )
      if (result.ok) {
        indexEntriesByModule.value[moduleId] = result.data.data.map((e) => markRaw(e))
      }
      return
    }

    if (canViewReleased(moduleId)) {
      const manifestEntry = manifestByModule.value[moduleId]
      if (!manifestEntry) return
      const data = await fetchAuthenticatedCollection<IndexEntry>(manifestEntry.content.index)
      if (data !== null) {
        indexEntriesByModule.value[moduleId] = data.map((e) => markRaw(e))
      }
    }
  }

  async function fetchGameData(systemId: string, moduleId: string): Promise<void> {
    if (canViewLive(moduleId)) {
      const result = await get<ApiCollection<GameDatum>>(
        `/systems/${systemId}/modules/${moduleId}/game-data`,
      )
      if (result.ok) {
        gameDataByModule.value[moduleId] = result.data.data.map((d) => markRaw(d))
      }
      return
    }

    if (canViewReleased(moduleId)) {
      const manifestEntry = manifestByModule.value[moduleId]
      if (!manifestEntry) return
      const data = await fetchAuthenticatedCollection<GameDatum>(manifestEntry.content['game-data'])
      if (data !== null) {
        gameDataByModule.value[moduleId] = data.map((d) => markRaw(d))
      }
    }
  }

  /**
   * Fetch rules + index entries for any active non-core modules not yet loaded.
   * Returns the modules that were fetched so callers can react (e.g. expand panel).
   */
  async function fetchMissingModules(systemId: string, modules: Module[]): Promise<Module[]> {
    const toLoad = modules.filter(
      (m) => !m.is_core && activeIds.value.includes(m.id) && !rulesByModule.value[m.id],
    )
    if (toLoad.length === 0) return []
    await Promise.all([
      ...toLoad.map((m) => fetchRules(systemId, m.id)),
      ...toLoad.map((m) => fetchIndexEntries(systemId, m.id)),
      ...toLoad.map((m) => fetchGameData(systemId, m.id)),
    ])
    return toLoad
  }

  function clear(): void {
    rulesByModule.value = {}
    indexEntriesByModule.value = {}
    gameDataByModule.value = {}
    manifestByModule.value = {}
  }

  return {
    rulesByModule,
    indexEntriesByModule,
    gameDataByModule,
    manifestByModule,
    loading,
    activeIds,
    activeModules,
    permissionsFor,
    canViewLive,
    canViewReleased,
    isUnavailable,
    canEditModule,
    allRules,
    rulesById,
    rulesByNumber,
    moduleById,
    moduleBySlug,
    rulesByModuleNumber,
    resolveRuleReference,
    hasRuleReference,
    childrenMap,
    ruleDepths,
    flattenedRulesByModule,
    allIndexEntries,
    indexEntriesByTerm,
    indexEntriesById,
    indexEntriesByParent,
    visibleIndexEntryIds,
    allGameData,
    fetchManifest,
    fetchRules,
    updateRule,
    updateIndexEntry,
    fetchIndexEntries,
    fetchGameData,
    fetchMissingModules,
    clear,
  }
})
