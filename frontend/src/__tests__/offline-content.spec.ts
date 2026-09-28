import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mock useApi for the content store ────────────────────────────────────────
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

// ─── Mock the cache store read helpers ────────────────────────────────────────
const { mockGetCachedSystem, mockGetCachedManifest, mockGetCachedContent } = vi.hoisted(() => ({
  mockGetCachedSystem: vi.fn(),
  mockGetCachedManifest: vi.fn(),
  mockGetCachedContent: vi.fn(),
}))

vi.mock('@/stores/cacheStore', () => ({
  useCacheStore: vi.fn(() => ({
    getCachedSystem: mockGetCachedSystem,
    getCachedManifest: mockGetCachedManifest,
    getCachedContent: mockGetCachedContent,
  })),
}))

import { useContentStore } from '@/stores/content'
import { useOnline } from '@/composables/useOnline'
import type { Rule, IndexEntry, GameDatum, ManifestEntry, System, Module } from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSystem(id: string): System {
  return {
    id,
    slug: id,
    name: `System ${id}`,
    description: null,
    config: null,
    permissions: { 'system.manage': false, 'membership.manage': false, 'module.create': false },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeModule(id: string): Module {
  return {
    id,
    system_id: 'sys1',
    slug: id,
    name: `Module ${id}`,
    description: null,
    config: null,
    is_core: true,
    sort_order: 0,
    permissions: {
      'module.update': false,
      'module.delete': false,
      'content.view_live': false,
      'content.view_released': true,
      'content.edit': false,
      'content.proofread': false,
      'version.publish': false,
      'version.amend_latest': false,
      'subscription.manage': false,
    },
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

// ─────────────────────────────────────────────────────────────────────────────

describe('useContentStore — offline cache reads', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockGetCachedSystem.mockReset()
    mockGetCachedManifest.mockReset()
    mockGetCachedContent.mockReset()
  })

  afterEach(() => {
    useOnline().online.value = true
  })

  it('reads rules from the cache when offline, normalising <br> to newlines', async () => {
    useOnline().online.value = false
    mockGetCachedContent.mockResolvedValue({
      version_id: 'v1',
      items: [{ ...makeRule('r1'), content: 'line1<br>line2' }],
    })

    const store = useContentStore()
    await store.fetchRules('sys1', 'mod1')

    expect(mockGetCachedContent).toHaveBeenCalledWith('sys1', 'mod1', 'rules')
    expect(store.rulesByModule['mod1']?.[0]?.content).toBe('line1\nline2')
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('re-keys released rules by rule_id and remaps snapshot parent_id when offline', async () => {
    useOnline().online.value = false
    mockGetCachedContent.mockResolvedValue({
      version_id: 'v1',
      items: [
        { ...makeRule('snap-parent'), rule_id: 'live-parent' },
        { ...makeRule('snap-child'), rule_id: 'live-child', parent_id: 'snap-parent' },
      ],
    })

    const store = useContentStore()
    await store.fetchRules('sys1', 'mod1')

    const rules = store.rulesByModule['mod1']!
    expect(rules.map((r) => r.id)).toEqual(['live-parent', 'live-child'])
    expect(rules[1]?.parent_id).toBe('live-parent')
  })

  it('reads index entries from the cache when offline', async () => {
    useOnline().online.value = false
    mockGetCachedContent.mockResolvedValue({ version_id: 'v1', items: [makeIndexEntry('e1')] })

    const store = useContentStore()
    await store.fetchIndexEntries('sys1', 'mod1')

    expect(mockGetCachedContent).toHaveBeenCalledWith('sys1', 'mod1', 'index')
    expect(store.indexEntriesByModule['mod1']).toHaveLength(1)
  })

  it('re-keys released index entries by index_entry_id when offline', async () => {
    useOnline().online.value = false
    mockGetCachedContent.mockResolvedValue({
      version_id: 'v1',
      items: [
        { ...makeIndexEntry('snap-parent'), index_entry_id: 'live-parent' },
        { ...makeIndexEntry('snap-child'), index_entry_id: 'live-child', parent_id: 'snap-parent' },
      ],
    })

    const store = useContentStore()
    await store.fetchIndexEntries('sys1', 'mod1')

    const entries = store.indexEntriesByModule['mod1']!
    expect(entries.map((e) => e.id)).toEqual(['live-parent', 'live-child'])
    expect(entries[1]?.parent_id).toBe('live-parent')
  })

  it('reads game data from the cache when offline', async () => {
    useOnline().online.value = false
    mockGetCachedContent.mockResolvedValue({ version_id: 'v1', items: [makeGameDatum('gd1')] })

    const store = useContentStore()
    await store.fetchGameData('sys1', 'mod1')

    expect(mockGetCachedContent).toHaveBeenCalledWith('sys1', 'mod1', 'game-data')
    expect(store.gameDataByModule['mod1']).toHaveLength(1)
  })

  it('re-keys released game data by game_datum_id when offline', async () => {
    useOnline().online.value = false
    mockGetCachedContent.mockResolvedValue({
      version_id: 'v1',
      items: [{ ...makeGameDatum('snap-gd'), game_datum_id: 'live-gd' }],
    })

    const store = useContentStore()
    await store.fetchGameData('sys1', 'mod1')

    expect(store.gameDataByModule['mod1']?.[0]?.id).toBe('live-gd')
  })

  it('rebuilds the manifest from the cached system and manifests when offline', async () => {
    useOnline().online.value = false
    mockGetCachedSystem.mockResolvedValue({
      system: makeSystem('sys1'),
      modules: [makeModule('mod1')],
    })
    mockGetCachedManifest.mockResolvedValue(makeManifestEntry('mod1'))

    const store = useContentStore()
    await store.fetchManifest('sys1')

    expect(mockGetCachedSystem).toHaveBeenCalledWith('sys1')
    expect(mockGetCachedManifest).toHaveBeenCalledWith('sys1', 'mod1')
    expect(store.manifestByModule['mod1']).toEqual(makeManifestEntry('mod1'))
    expect(mockGet).not.toHaveBeenCalled()
  })

  it('skips the cache when online', async () => {
    useOnline().online.value = true
    mockGet.mockResolvedValue({ ok: false, errors: {} })

    const store = useContentStore()
    await store.fetchRules('sys1', 'mod1')

    expect(mockGetCachedContent).not.toHaveBeenCalled()
  })
})
