import { ref, computed, markRaw, type ComputedRef } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useOnline } from '@/composables/useOnline'
import { request } from '@/lib/http'
import type { ApiResult } from '@/lib/http'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useCacheStore } from '@/stores/cacheStore'
import { parseRuleRange, parseRuleReference } from '@/lib/ruleReferences'
import type {
  Rule,
  IndexEntry,
  Module,
  ModulePermissions,
  GameDatum,
  ManifestEntry,
  BookmarkEntry,
  ContentMode,
  ApiCollection,
  ApiResource,
  UpdateRuleRequest,
  UpdateIndexEntryRequest,
  BrokenReference,
  RuleDeletionMode,
} from '@/types/domain'

/**
 * Normalize released content entities so they are keyed by the original live
 * entity id rather than the snapshot id. Released snapshots carry both the
 * snapshot `id` and a stable reference (`rule_id` / `index_entry_id` /
 * `game_datum_id`) to the original live entity, plus a `parent_id` that points
 * at a sibling *snapshot* id. Re-keying on the stable id keeps bookmarks,
 * history, proofreads and the various `*ById` lookups consistent across Draft,
 * Release and offline.
 */
function normalizeRules(items: Rule[]): Rule[] {
  const idBySnapshot = new Map<string, string>()
  for (const rule of items) {
    if (rule.rule_id) idBySnapshot.set(rule.id, rule.rule_id)
  }
  return items.map((rule) =>
    markRaw({
      ...rule,
      id: rule.rule_id ?? rule.id,
      parent_id:
        rule.parent_id === null ? null : (idBySnapshot.get(rule.parent_id) ?? rule.parent_id),
      content: rule.content.split('<br>').join('\n'),
    }),
  )
}

function normalizeIndexEntries(items: IndexEntry[]): IndexEntry[] {
  const idBySnapshot = new Map<string, string>()
  for (const entry of items) {
    if (entry.index_entry_id) idBySnapshot.set(entry.id, entry.index_entry_id)
  }
  return items.map((entry) =>
    markRaw({
      ...entry,
      id: entry.index_entry_id ?? entry.id,
      parent_id:
        entry.parent_id === null ? null : (idBySnapshot.get(entry.parent_id) ?? entry.parent_id),
    }),
  )
}

function normalizeGameData(items: GameDatum[]): GameDatum[] {
  return items.map((datum) =>
    markRaw({
      ...datum,
      id: datum.game_datum_id ?? datum.id,
    }),
  )
}

export const useContentStore = defineStore('content', () => {
  const { get, put, del, loading } = useApi()
  const systemStore = useSystemStore()
  const membershipStore = useMembershipStore()
  const cacheStore = useCacheStore()
  const { offline } = useOnline()

  const rulesByModule = ref<Record<string, Rule[]>>({})
  const indexEntriesByModule = ref<Record<string, IndexEntry[]>>({})
  const gameDataByModule = ref<Record<string, GameDatum[]>>({})
  const manifestByModule = ref<Record<string, ManifestEntry>>({})
  const viewMode = ref<ContentMode>('draft')

  // Session-scoped live-draft cache. Live content is mutable and only editors
  // see it; re-fetching it on every Draft/Release toggle is unnecessary.
  const draftRulesByModule = ref<Record<string, Rule[]>>({})
  const draftIndexEntriesByModule = ref<Record<string, IndexEntry[]>>({})
  const draftGameDataByModule = ref<Record<string, GameDatum[]>>({})

  // Monotonic token bumped on every refresh/system-switch. Each fetch captures
  // it at start and discards its writes if a newer refresh has since started.
  let refreshSeq = 0

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const selectedModuleId = computed(
    (): string | null => membershipStore.membership?.config?.selected_module_id ?? null,
  )

  /** The system's single core module (identified by `is_core`, else the first module). */
  const coreModule = computed((): Module | undefined => {
    const modules = systemStore.modules
    return modules.find((m) => m.is_core) ?? modules[0]
  })

  const activeModules = computed((): Module[] => {
    const core = coreModule.value
    const selectedId = selectedModuleId.value

    const rest: Module[] = []
    if (selectedId) {
      const selected = systemStore.modules.find((m) => m.id === selectedId)
      if (selected && selected.id !== core?.id) rest.push(selected)
    } else {
      for (const m of systemStore.modules) {
        if (m.id !== core?.id && !isUnavailable(m.id)) rest.push(m)
      }
    }
    rest.sort((a, b) => a.sort_order - b.sort_order)

    return core ? [core, ...rest] : rest
  })

  /**
   * The one module whose SOP and index are shown: the selected module if set,
   * else the core module. Singular surfaces are never merged.
   */
  const singularModule = computed((): Module | undefined => {
    const selectedId = selectedModuleId.value
    if (!selectedId) return coreModule.value
    return systemStore.modules.find((m) => m.id === selectedId) ?? coreModule.value
  })

  /**
   * Top-level rules across the active modules, ordered module-first (core, then
   * non-core by `sort_order`) and by `sort_order` within each module.
   *
   * Used only by `global_rule_numbers` systems, which render the whole system as
   * one flat tree without per-module headers.
   */
  const flatRootRules = computed((): Rule[] => {
    const roots: Rule[] = []
    for (const mod of activeModules.value) {
      const moduleRoots = (rulesByModule.value[mod.id] ?? [])
        .filter((r) => r.parent_id === null)
        .sort((a, b) => a.sort_order - b.sort_order)
      roots.push(...moduleRoots)
    }

    return roots
  })

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

  /**
   * Whether this module's content is currently served from the live draft
   * source (as opposed to a released snapshot). Mirrors the fetch ladder:
   * offline always serves pinned released content, never live drafts.
   */
  function usesLiveContent(moduleId: string): boolean {
    return !offline.value && viewMode.value === 'draft' && canViewLive(moduleId)
  }

  /** The source a module's content is currently served from. */
  function contentModeFor(moduleId: string): ContentMode {
    return usesLiveContent(moduleId) ? 'draft' : 'release'
  }

  /**
   * Whether this module has a released snapshot available to read.
   */
  function hasReleasedContent(moduleId: string): boolean {
    const entry = manifestByModule.value[moduleId]
    return entry?.content != null && entry.version_id != null
  }

  function isUnavailable(moduleId: string): boolean {
    return !canViewLive(moduleId) && !canViewReleased(moduleId)
  }

  function isRuleAvailable(ruleId: string): boolean {
    return rulesById.value.has(ruleId)
  }

  function isGameDatumAvailable(id: string): boolean {
    return gameDataById.value.has(id)
  }

  function isBookmarkTargetAvailable(entry: BookmarkEntry): boolean {
    return entry.type === 'rule' ? isRuleAvailable(entry.id) : isGameDatumAvailable(entry.id)
  }

  function setViewMode(mode: ContentMode): void {
    viewMode.value = mode
  }

  /**
   * Switch the global view mode and reload the active content for that source.
   * UI callers await this so a bookmark/history target is resolvable before
   * navigation.
   */
  async function switchViewMode(mode: ContentMode): Promise<void> {
    if (viewMode.value === mode) return
    if (mode === 'draft' && (offline.value || !canSwitchView.value)) return

    const systemId = systemStore.currentSystem?.id
    if (viewMode.value === 'draft' && !offline.value) stashDraftContent()

    viewMode.value = mode
    if (!systemId) return

    clearPerModuleContent()
    if (mode === 'draft') restoreDraftContent()

    await hydrateActiveContent(systemId)
    if (globalRuleNumbers.value) {
      await fetchMissingModules(systemId, systemStore.modules)
    }
  }

  /**
   * Whether the current user can edit this module's content.
   */
  function canEditModule(moduleId: string): boolean {
    return permissionsFor(moduleId)?.['content.edit'] ?? false
  }

  /**
   * Whether the current user can switch between draft and released views for
   * this system — true when at least one active module is readable live.
   */
  const canSwitchView = computed(() => activeModules.value.some((m) => canViewLive(m.id)))

  /**
   * The mode the reader is effectively in. Players and offline sessions always
   * read released content even though `viewMode` defaults to draft.
   */
  const effectiveViewMode = computed((): ContentMode => {
    if (offline.value) return 'release'
    return viewMode.value === 'draft' && canSwitchView.value ? 'draft' : 'release'
  })

  const releaseViewEmpty = computed(
    (): boolean =>
      viewMode.value === 'release' &&
      activeModules.value.length > 0 &&
      activeModules.value.every((m) => !manifestByModule.value[m.id]?.content),
  )

  const allRules = computed((): Rule[] =>
    activeModules.value.flatMap((m) => rulesByModule.value[m.id] ?? []),
  )

  /**
   * Rules from every module with loaded content, active or not. Used for
   * system-wide reference lookup; display surfaces still use `allRules` so a
   * selected expansion does not leak into the reading view.
   */
  const allLoadedRules = computed((): Rule[] => Object.values(rulesByModule.value).flat())

  /** O(1) lookup by rule.id */
  const rulesById = computed((): Map<string, Rule> => {
    const m = new Map<string, Rule>()
    for (const r of allRules.value) m.set(r.id, r)
    return m
  })

  /** O(1) lookup by rule.number across all loaded modules — used by delegation hover/click */
  const rulesByNumber = computed((): Map<string, Rule> => {
    const m = new Map<string, Rule>()
    for (const r of allLoadedRules.value) m.set(r.number, r)
    return m
  })

  /** O(1) lookup of active modules by id. */
  const moduleById = computed((): Map<string, Module> => {
    const m = new Map<string, Module>()
    for (const mod of activeModules.value) m.set(mod.id, mod)
    return m
  })

  /** O(1) lookup of system modules by slug — used for `{{L:module-slug:number}}` links. */
  const moduleBySlug = computed((): Map<string, Module> => {
    const m = new Map<string, Module>()
    for (const mod of systemStore.modules) m.set(mod.slug, mod)
    return m
  })

  /** Module-scoped rule lookup over all loaded modules: module_id → (rule.number → rule). */
  const rulesByModuleNumber = computed((): Map<string, Map<string, Rule>> => {
    const m = new Map<string, Map<string, Rule>>()
    for (const [moduleId, rules] of Object.entries(rulesByModule.value)) {
      const inner = new Map<string, Rule>()
      for (const r of rules) inner.set(r.number, r)
      m.set(moduleId, inner)
    }
    return m
  })

  const globalRuleNumbers = computed(
    (): boolean => systemStore.currentSystem?.config?.global_rule_numbers ?? false,
  )

  /**
   * Resolve a rule reference to a rule.
   *
   * A reference may carry its own module-slug prefix (`o:O.5.1`, from stored
   * index refs) or receive one from the rendered link context
   * (`{{L:core:3.4}}`). Either resolves in that module in every mode. A bare
   * reference (`{{L:1.2}}`) resolves system-wide when rule numbers are
   * system-wide unique (`global_rule_numbers`), otherwise it resolves in the
   * module that owns the content being rendered.
   */
  function resolveRuleReference(
    number: string,
    opts?: { moduleSlug?: string; moduleId?: string },
  ): Rule | null {
    const parsed = parseRuleReference(number)
    const moduleSlug = parsed.moduleSlug ?? opts?.moduleSlug

    if (moduleSlug) {
      const mod = moduleBySlug.value.get(moduleSlug)
      if (!mod) return null
      return rulesByModuleNumber.value.get(mod.id)?.get(parsed.number) ?? null
    }

    if (globalRuleNumbers.value) {
      return rulesByNumber.value.get(parsed.number) ?? null
    }

    const moduleId = opts?.moduleId
    if (!moduleId) return null
    return rulesByModuleNumber.value.get(moduleId)?.get(parsed.number) ?? null
  }

  function hasSingleRuleReference(ref: string, moduleId: string): boolean {
    const parsed = parseRuleReference(ref)

    if (parsed.moduleSlug) {
      const mod = moduleBySlug.value.get(parsed.moduleSlug)
      if (!mod) return false
      return rulesByModuleNumber.value.get(mod.id)?.has(parsed.number) ?? false
    }

    if (globalRuleNumbers.value) return rulesByNumber.value.has(parsed.number)
    return rulesByModuleNumber.value.get(moduleId)?.has(parsed.number) ?? false
  }

  /**
   * Whether the given rule reference resolves for the given entry's module.
   * Module prefixes are honoured on each endpoint of a range. A bare number
   * must match a rule in the entry's module (or system-wide when
   * `global_rule_numbers`).
   */
  function hasRuleReference(ref: string, moduleId: string): boolean {
    const range = parseRuleRange(ref)
    if (range) {
      return (
        hasSingleRuleReference(range.from, moduleId) && hasSingleRuleReference(range.to, moduleId)
      )
    }
    return hasSingleRuleReference(ref, moduleId)
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

  const allIndexEntries = computed((): IndexEntry[] => {
    const modules: Module[] = []
    const core = coreModule.value
    if (core) modules.push(core)

    const singular = singularModule.value
    if (singular && singular.id !== core?.id) modules.push(singular)

    const seen = new Set<string>()
    const entries: IndexEntry[] = []
    for (const mod of modules) {
      for (const entry of indexEntriesByModule.value[mod.id] ?? []) {
        if (seen.has(entry.id)) continue
        seen.add(entry.id)
        entries.push(entry)
      }
    }
    return entries
  })

  const allGameData = computed((): GameDatum[] =>
    activeModules.value.flatMap((m) => gameDataByModule.value[m.id] ?? []),
  )

  /** O(1) lookup by game-datum id. */
  const gameDataById = computed((): Map<string, GameDatum> => {
    const m = new Map<string, GameDatum>()
    for (const d of allGameData.value) m.set(d.id, d)
    return m
  })

  /** Game data from the singular module only — backs the SOP surface (never merged). */
  const singularGameData = computed((): GameDatum[] => {
    const singular = singularModule.value
    return singular ? (gameDataByModule.value[singular.id] ?? []) : []
  })

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
    if (offline.value) {
      const cached = await cacheStore.getCachedSystem(systemId)
      if (cached) {
        const map: Record<string, ManifestEntry> = {}
        for (const module of cached.modules) {
          const entry = await cacheStore.getCachedManifest(systemId, module.id)
          if (entry) map[module.id] = entry
        }
        manifestByModule.value = map
      }
      return
    }

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
   * Re-pin the current system's offline copy in the background when it is
   * cached but its stored version no longer matches the freshly loaded manifest.
   * No-ops when offline or not cached.
   */
  async function autoRefreshPin(systemId: string): Promise<void> {
    if (offline.value) return
    if (!cacheStore.isCached(systemId)) return
    const versions = Object.values(manifestByModule.value)
      .map((e) => e.version_string)
      .filter((value): value is string => value != null)
    const current = [...new Set(versions)].join(', ')
    await cacheStore.refreshIfStale(systemId, current)
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
    const seq = refreshSeq

    if (offline.value) {
      const cached = await cacheStore.getCachedContent<Rule>(systemId, moduleId, 'rules')
      if (seq !== refreshSeq) return
      if (cached) {
        rulesByModule.value[moduleId] = normalizeRules(cached.items)
      }
      return
    }

    if (viewMode.value === 'draft' && canViewLive(moduleId)) {
      const result = await get<ApiCollection<Rule>>(
        `/systems/${systemId}/modules/${moduleId}/rules`,
      )
      if (seq !== refreshSeq) return
      if (result.ok) {
        rulesByModule.value[moduleId] = result.data.data.map((r) =>
          markRaw({ ...r, content: r.content.split('<br>').join('\n') }),
        )
      }
      return
    }

    if (canViewReleased(moduleId)) {
      const manifestEntry = manifestByModule.value[moduleId]
      if (!manifestEntry?.content) return
      const cached = await cacheStore.getCachedContent<Rule>(systemId, moduleId, 'rules')
      if (seq !== refreshSeq) return
      if (cached && cached.version_id === manifestEntry.version_id) {
        rulesByModule.value[moduleId] = normalizeRules(cached.items)
        return
      }
      const data = await fetchAuthenticatedCollection<Rule>(manifestEntry.content.rules)
      if (seq !== refreshSeq) return
      if (data !== null) {
        rulesByModule.value[moduleId] = normalizeRules(data)
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
      data,
    )

    if (result.ok) {
      const stored = markRaw({
        ...result.data.data,
        content: result.data.data.content.split('<br>').join('\n'),
      })
      // Only replace the displayed rule when this module is currently served
      // from the live source. In release mode a live edit must not leak into
      // the released snapshot shown to the reader.
      if (usesLiveContent(rule.module_id)) {
        const list = rulesByModule.value[rule.module_id] ?? []
        const idx = list.indexOf(rulesById.value.get(rule.id)!)
        if (idx !== -1) list[idx] = stored
      }
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
    const seq = refreshSeq

    if (offline.value) {
      const cached = await cacheStore.getCachedContent<IndexEntry>(systemId, moduleId, 'index')
      if (seq !== refreshSeq) return
      if (cached) {
        indexEntriesByModule.value[moduleId] = normalizeIndexEntries(cached.items)
      }
      return
    }

    if (viewMode.value === 'draft' && canViewLive(moduleId)) {
      const result = await get<ApiCollection<IndexEntry>>(
        `/systems/${systemId}/modules/${moduleId}/index-entries`,
      )
      if (seq !== refreshSeq) return
      if (result.ok) {
        indexEntriesByModule.value[moduleId] = result.data.data.map((e) => markRaw(e))
      }
      return
    }

    if (canViewReleased(moduleId)) {
      const manifestEntry = manifestByModule.value[moduleId]
      if (!manifestEntry?.content) return
      const cached = await cacheStore.getCachedContent<IndexEntry>(systemId, moduleId, 'index')
      if (seq !== refreshSeq) return
      if (cached && cached.version_id === manifestEntry.version_id) {
        indexEntriesByModule.value[moduleId] = normalizeIndexEntries(cached.items)
        return
      }
      const data = await fetchAuthenticatedCollection<IndexEntry>(manifestEntry.content.index)
      if (seq !== refreshSeq) return
      if (data !== null) {
        indexEntriesByModule.value[moduleId] = normalizeIndexEntries(data)
      }
    }
  }

  async function fetchGameData(systemId: string, moduleId: string): Promise<void> {
    const seq = refreshSeq

    if (offline.value) {
      const cached = await cacheStore.getCachedContent<GameDatum>(systemId, moduleId, 'game-data')
      if (seq !== refreshSeq) return
      if (cached) {
        gameDataByModule.value[moduleId] = normalizeGameData(cached.items)
      }
      return
    }

    if (viewMode.value === 'draft' && canViewLive(moduleId)) {
      const result = await get<ApiCollection<GameDatum>>(
        `/systems/${systemId}/modules/${moduleId}/game-data`,
      )
      if (seq !== refreshSeq) return
      if (result.ok) {
        gameDataByModule.value[moduleId] = result.data.data.map((d) => markRaw(d))
      }
      return
    }

    if (canViewReleased(moduleId)) {
      const manifestEntry = manifestByModule.value[moduleId]
      if (!manifestEntry?.content) return
      const cached = await cacheStore.getCachedContent<GameDatum>(systemId, moduleId, 'game-data')
      if (seq !== refreshSeq) return
      if (cached && cached.version_id === manifestEntry.version_id) {
        gameDataByModule.value[moduleId] = normalizeGameData(cached.items)
        return
      }
      const data = await fetchAuthenticatedCollection<GameDatum>(manifestEntry.content['game-data'])
      if (seq !== refreshSeq) return
      if (data !== null) {
        gameDataByModule.value[moduleId] = normalizeGameData(data)
      }
    }
  }

  /**
   * Fetch rules + index entries for any active non-core modules not yet loaded.
   * Returns the modules that were fetched so callers can react (e.g. expand panel).
   */
  async function fetchMissingModules(systemId: string, modules: Module[]): Promise<Module[]> {
    const toLoad = modules.filter((m) => !isUnavailable(m.id) && !rulesByModule.value[m.id])
    if (toLoad.length === 0) return []
    await Promise.allSettled([
      ...toLoad.map((m) => fetchRules(systemId, m.id)),
      ...toLoad.map((m) => fetchIndexEntries(systemId, m.id)),
      ...toLoad.map((m) => fetchGameData(systemId, m.id)),
    ])
    return toLoad
  }

  /** Fetch any content kind that is not yet loaded for the active modules. */
  async function hydrateActiveContent(systemId: string): Promise<void> {
    const modules = activeModules.value
    await Promise.allSettled([
      ...modules
        .filter((m) => !(m.id in rulesByModule.value))
        .map((m) => fetchRules(systemId, m.id)),
      ...modules
        .filter((m) => !(m.id in indexEntriesByModule.value))
        .map((m) => fetchIndexEntries(systemId, m.id)),
      ...modules
        .filter((m) => !(m.id in gameDataByModule.value))
        .map((m) => fetchGameData(systemId, m.id)),
    ])
  }

  // ---------------------------------------------------------------------------
  // Delete / lint
  // ---------------------------------------------------------------------------

  /**
   * Delete the rule, reparenting direct children (default) or removing the
   * whole subtree when `mode` is `recursive`.
   */
  async function deleteRule(
    systemId: string,
    rule: Rule,
    mode: RuleDeletionMode,
  ): Promise<ApiResult<void>> {
    const result = await del<void, { mode: RuleDeletionMode }>(
      `/systems/${systemId}/modules/${rule.module_id}/rules/${rule.id}`,
      { mode },
    )

    if (result.ok) {
      const list = rulesByModule.value[rule.module_id] ?? []
      const removedIds = mode === 'recursive' ? descendantIds(rule.id) : new Set([rule.id])

      if (mode === 're_parent') {
        for (const child of childrenMap.value.get(rule.id) ?? []) {
          child.parent_id = rule.parent_id
        }
      }

      rulesByModule.value[rule.module_id] = list.filter((r) => !removedIds.has(r.id))
    }

    return result
  }

  /**
   * Fetch the system's broken-link lint results.
   */
  async function fetchLint(systemId: string): Promise<ApiResult<BrokenReference[]>> {
    const result = await get<ApiCollection<BrokenReference>>(`/systems/${systemId}/lint`)

    if (result.ok) {
      return { ok: true, data: result.data.data }
    }

    return result
  }

  /**
   * Re-fetch rules, index entries and game data for every active module.
   * Clears the per-module maps first and bumps the refresh token so any
   * in-flight fetch from a previous mode is discarded on resolution.
   */
  async function refreshContent(systemId: string): Promise<void> {
    refreshSeq++
    clearPerModuleContent()
    clearDraftCache()
    const modules = activeModules.value
    await Promise.allSettled([
      ...modules.map((m) => fetchRules(systemId, m.id)),
      ...modules.map((m) => fetchIndexEntries(systemId, m.id)),
      ...modules.map((m) => fetchGameData(systemId, m.id)),
    ])
  }

  /**
   * Collect the given rule and all of its descendants by id.
   */
  function descendantIds(ruleId: string): Set<string> {
    const ids = new Set<string>([ruleId])
    const queue = [ruleId]
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const child of childrenMap.value.get(current) ?? []) {
        ids.add(child.id)
        queue.push(child.id)
      }
    }
    return ids
  }

  function clearPerModuleContent(): void {
    rulesByModule.value = {}
    indexEntriesByModule.value = {}
    gameDataByModule.value = {}
  }

  /** Preserve live-draft content before showing the released snapshot. */
  function stashDraftContent(): void {
    for (const [moduleId, rules] of Object.entries(rulesByModule.value)) {
      if (canViewLive(moduleId)) draftRulesByModule.value[moduleId] = rules
    }
    for (const [moduleId, entries] of Object.entries(indexEntriesByModule.value)) {
      if (canViewLive(moduleId)) draftIndexEntriesByModule.value[moduleId] = entries
    }
    for (const [moduleId, data] of Object.entries(gameDataByModule.value)) {
      if (canViewLive(moduleId)) draftGameDataByModule.value[moduleId] = data
    }
  }

  /** Restore cached live-draft content when returning to Draft view. */
  function restoreDraftContent(): void {
    for (const [moduleId, rules] of Object.entries(draftRulesByModule.value)) {
      if (canViewLive(moduleId)) rulesByModule.value[moduleId] = rules
    }
    for (const [moduleId, entries] of Object.entries(draftIndexEntriesByModule.value)) {
      if (canViewLive(moduleId)) indexEntriesByModule.value[moduleId] = entries
    }
    for (const [moduleId, data] of Object.entries(draftGameDataByModule.value)) {
      if (canViewLive(moduleId)) gameDataByModule.value[moduleId] = data
    }
  }

  function clearDraftCache(): void {
    draftRulesByModule.value = {}
    draftIndexEntriesByModule.value = {}
    draftGameDataByModule.value = {}
  }

  function clear(): void {
    refreshSeq++
    clearPerModuleContent()
    clearDraftCache()
    manifestByModule.value = {}
    viewMode.value = 'draft'
  }

  return {
    rulesByModule,
    indexEntriesByModule,
    gameDataByModule,
    manifestByModule,
    viewMode,
    loading,
    selectedModuleId,
    coreModule,
    activeModules,
    singularModule,
    flatRootRules,
    globalRuleNumbers,
    permissionsFor,
    canViewLive,
    canViewReleased,
    usesLiveContent,
    contentModeFor,
    effectiveViewMode,
    hasReleasedContent,
    isUnavailable,
    isRuleAvailable,
    isGameDatumAvailable,
    isBookmarkTargetAvailable,
    setViewMode,
    switchViewMode,
    canSwitchView,
    releaseViewEmpty,
    canEditModule,
    allRules,
    allLoadedRules,
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
    gameDataById,
    singularGameData,
    fetchManifest,
    fetchRules,
    updateRule,
    updateIndexEntry,
    fetchIndexEntries,
    fetchGameData,
    fetchMissingModules,
    deleteRule,
    fetchLint,
    refreshContent,
    autoRefreshPin,
    clear,
  }
})
