import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { closeIdb } from '@/lib/idb'

// ─── Mock useApi for all stores that import it ────────────────────────────────
const mockGet = vi.fn()
const mockLoading = ref(false)

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    patch: vi.fn(),
    loading: mockLoading,
  })),
}))

// ─── Mock the authenticated request() from http.ts ────────────────────────────
const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }))

vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>()
  return { ...actual, request: mockRequest }
})

import { useCacheStore } from '@/stores/cacheStore'
import type {
  System,
  Module,
  ModulePermissions,
  ManifestEntry,
  Rule,
  IndexEntry,
  GameDatum,
} from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSystem(id: string): System {
  return {
    id,
    slug: id,
    name: `System ${id}`,
    description: null,
    config: {
      global_rule_numbers: true,
      sort_rules_by: 'number',
      toc_depth: 3,
      proofread_threshold: 3,
      cover_image: null,
    },
    permissions: { 'system.manage': false, 'membership.manage': false, 'module.create': false },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makePermissions(overrides: Partial<ModulePermissions> = {}): ModulePermissions {
  return {
    'module.update': false,
    'module.delete': false,
    'content.view_live': false,
    'content.view_released': false,
    'content.edit': false,
    'content.proofread': false,
    'version.publish': false,
    'version.amend_latest': false,
    'subscription.manage': false,
    ...overrides,
  }
}

function makeModule(
  id: string,
  permissions: ModulePermissions = makePermissions({ 'content.view_released': true }),
): Module {
  return {
    id,
    system_id: 'sys1',
    slug: id,
    name: `Module ${id}`,
    description: null,
    config: null,
    is_core: true,
    sort_order: 0,
    permissions,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeManifestEntry(moduleId: string): ManifestEntry {
  return {
    module_id: moduleId,
    version_id: 'v1',
    version_string: '1.0',
    released_at: '2024-01-01T00:00:00Z',
    revision: 0,
    content: {
      rules: `https://cdn.example.com/${moduleId}/rules.json`,
      index: `https://cdn.example.com/${moduleId}/index.json`,
      'game-data': `https://cdn.example.com/${moduleId}/game-data.json`,
    },
  }
}

function makeRule(id: string): Rule {
  return {
    id,
    module_id: 'mod1',
    parent_id: null,
    number: `1.${id}`,
    title: `Rule ${id}`,
    content: 'text',
    markdown: null,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeIndexEntry(id: string): IndexEntry {
  return {
    id,
    module_id: 'mod1',
    parent_id: null,
    term: `Term ${id}`,
    definition: 'A definition.',
    notes: null,
    relations: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeGameDatum(id: string): GameDatum {
  return {
    id,
    module_id: 'mod1',
    type: 'table',
    slug: id,
    name: `Table ${id}`,
    content: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function seedApi(system: System, modules: Module[], entries: ManifestEntry[]): void {
  mockGet.mockImplementation((url: string) => {
    if (url === `/systems/${system.id}`) {
      return Promise.resolve({ ok: true, data: { data: system } })
    }
    if (url === `/systems/${system.id}/modules`) {
      return Promise.resolve({ ok: true, data: { data: modules } })
    }
    if (url === `/systems/${system.id}/manifest`) {
      return Promise.resolve({
        ok: true,
        data: { data: { system_id: system.id, name: system.name, modules: entries } },
      })
    }
    return Promise.resolve({ ok: false, errors: {} })
  })

  mockRequest.mockImplementation((config: { url: string }) => {
    if (config.url.endsWith('rules.json')) return Promise.resolve([makeRule('r1')])
    if (config.url.endsWith('index.json')) return Promise.resolve([makeIndexEntry('e1')])
    if (config.url.endsWith('game-data.json')) return Promise.resolve([makeGameDatum('gd1')])
    return Promise.resolve([])
  })
}

async function resetIndexedDb(): Promise<void> {
  await closeIdb()
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('olgur-offline')
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useCacheStore — offline pinning', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockRequest.mockReset()
    await resetIndexedDb()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await resetIndexedDb()
  })

  it('pins a system: writes system, modules, manifests, content and meta to IndexedDB', async () => {
    const system = makeSystem('sys1')
    const module = makeModule('mod1')
    const entry = makeManifestEntry('mod1')
    seedApi(system, [module], [entry])

    const store = useCacheStore()
    await store.pinSystem('sys1')

    const cached = await store.getCachedSystem('sys1')
    expect(cached?.system.id).toBe('sys1')
    expect(cached?.modules).toHaveLength(1)

    const manifest = await store.getCachedManifest('sys1', 'mod1')
    expect(manifest?.version_id).toBe('v1')

    const rules = await store.getCachedContent<Rule>('sys1', 'mod1', 'rules')
    expect(rules?.version_id).toBe('v1')
    expect(rules?.items.map((r) => r.id)).toEqual(['r1'])

    const index = await store.getCachedContent<IndexEntry>('sys1', 'mod1', 'index')
    expect(index?.items.map((e) => e.id)).toEqual(['e1'])

    const gameData = await store.getCachedContent<GameDatum>('sys1', 'mod1', 'game-data')
    expect(gameData?.items.map((d) => d.id)).toEqual(['gd1'])

    expect(store.isCached('sys1')).toBe(true)
  })

  it('unpins a system: removes system, manifests, content and meta', async () => {
    const system = makeSystem('sys1')
    const module = makeModule('mod1')
    seedApi(system, [module], [makeManifestEntry('mod1')])

    const store = useCacheStore()
    await store.pinSystem('sys1')
    await store.unpinSystem('sys1')

    expect(await store.getCachedSystem('sys1')).toBeUndefined()
    expect(await store.getCachedManifest('sys1', 'mod1')).toBeUndefined()
    expect(await store.getCachedContent('sys1', 'mod1', 'rules')).toBeUndefined()
    expect(store.isCached('sys1')).toBe(false)
    expect(store.cachedSystems).toEqual([])
  })

  it('tracks the registry with name, version and non-zero size accounting', async () => {
    const system = makeSystem('sys1')
    const module = makeModule('mod1')
    seedApi(system, [module], [makeManifestEntry('mod1')])

    const store = useCacheStore()
    expect(store.isCached('sys1')).toBe(false)

    await store.pinSystem('sys1')

    expect(store.cachedSystems).toHaveLength(1)
    const meta = store.cachedSystems[0]
    expect(meta?.name).toBe('System sys1')
    expect(meta?.versionString).toBe('1.0')
    expect(meta?.size).toBeGreaterThan(0)
    expect(store.bytesUsed).toBe(meta?.size)
  })

  it('loads the registry from IndexedDB and reports storage usage without navigator.storage', async () => {
    const system = makeSystem('sys1')
    const module = makeModule('mod1')
    seedApi(system, [module], [makeManifestEntry('mod1')])

    const first = useCacheStore()
    await first.pinSystem('sys1')

    const second = useCacheStore()
    await second.loadRegistry()

    expect(second.cachedSystems).toHaveLength(1)
    expect(second.isCached('sys1')).toBe(true)

    const { usage } = await second.estimateStorage()
    expect(usage).toBeGreaterThan(0)
  })

  it('only caches released-content modules, skipping live-only modules', async () => {
    const system = makeSystem('sys1')
    const released = makeModule('mod1', makePermissions({ 'content.view_released': true }))
    const liveOnly = makeModule('mod2', makePermissions({ 'content.view_live': true }))
    seedApi(system, [released, liveOnly], [makeManifestEntry('mod1'), makeManifestEntry('mod2')])

    const store = useCacheStore()
    await store.pinSystem('sys1')

    expect(await store.getCachedManifest('sys1', 'mod1')).toBeDefined()
    expect(await store.getCachedManifest('sys1', 'mod2')).toBeUndefined()
    expect(await store.getCachedContent('sys1', 'mod2', 'rules')).toBeUndefined()
  })

  it('does not mark a system cached when no module has released content', async () => {
    const system = makeSystem('sys1')
    const liveOnly = makeModule('mod1', makePermissions({ 'content.view_live': true }))
    seedApi(system, [liveOnly], [makeManifestEntry('mod1')])

    const store = useCacheStore()
    await store.pinSystem('sys1')

    expect(store.isCached('sys1')).toBe(false)
    expect(store.cachedSystems).toEqual([])
    expect(await store.getCachedSystem('sys1')).toBeUndefined()
  })

  it('skips a module whose manifest entry has null content without throwing', async () => {
    const system = makeSystem('sys1')
    const module = makeModule('mod1')
    const nullEntry = { ...makeManifestEntry('mod1'), content: null } as unknown as ManifestEntry
    seedApi(system, [module], [nullEntry])

    const store = useCacheStore()
    await expect(store.pinSystem('sys1')).resolves.toBeUndefined()

    expect(store.isCached('sys1')).toBe(false)
    expect(await store.getCachedManifest('sys1', 'mod1')).toBeUndefined()
  })

  it('marks pinInProgress while pinning and clears it when done', async () => {
    const system = makeSystem('sys1')
    const module = makeModule('mod1')
    seedApi(system, [module], [makeManifestEntry('mod1')])

    const store = useCacheStore()
    const pending = store.pinSystem('sys1')

    expect(store.pinInProgress.has('sys1')).toBe(true)

    await pending

    expect(store.pinInProgress.has('sys1')).toBe(false)
  })
})
