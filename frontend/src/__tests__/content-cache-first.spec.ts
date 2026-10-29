import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

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

// ─── Mock the cache store read helper ─────────────────────────────────────────
const { mockGetCachedContent } = vi.hoisted(() => ({
  mockGetCachedContent: vi.fn(),
}))

vi.mock('@/stores/cacheStore', () => ({
  useCacheStore: vi.fn(() => ({
    getCachedContent: mockGetCachedContent,
  })),
}))

import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
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
  permissions: ModulePermissions = makePermissions(),
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
    draft_revision: 0,
    permissions,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeManifestEntry(
  moduleId: string,
  versionId = 'v1',
): ManifestEntry & { content: NonNullable<ManifestEntry['content']> } {
  return {
    module_id: moduleId,
    version_id: versionId,
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

function seedReleasedModule(moduleId: string): void {
  const systemStore = useSystemStore()
  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [
    makeModule(moduleId, makePermissions({ 'content.view_released': true })),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useContentStore — version-aware cache-first released reads', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockRequest.mockReset()
    mockGetCachedContent.mockReset()
  })

  describe('fetchRules', () => {
    it('serves from cache when the cached version_id matches the manifest', async () => {
      seedReleasedModule('mod1')
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod1'] = makeManifestEntry('mod1')

      mockGetCachedContent.mockResolvedValue({
        version_id: 'v1',
        items: [{ ...makeRule('r1'), content: 'line1<br>line2' }],
      })

      await contentStore.fetchRules('sys1', 'mod1')

      expect(mockGetCachedContent).toHaveBeenCalledWith('sys1', 'mod1', 'rules')
      expect(mockRequest).not.toHaveBeenCalled()
      expect(contentStore.rulesByModule['mod1']?.[0]?.content).toBe('line1\nline2')
    })

    it('falls through to network when the cached version_id differs', async () => {
      seedReleasedModule('mod1')
      const contentStore = useContentStore()
      const entry = makeManifestEntry('mod1', 'v2')
      contentStore.manifestByModule['mod1'] = entry

      mockGetCachedContent.mockResolvedValue({
        version_id: 'v1',
        items: [makeRule('r-stale')],
      })
      mockRequest.mockResolvedValue([makeRule('r-fresh')])

      await contentStore.fetchRules('sys1', 'mod1')

      expect(mockRequest).toHaveBeenCalledWith({ method: 'GET', url: entry.content.rules })
      expect(contentStore.rulesByModule['mod1']).toHaveLength(1)
      expect(contentStore.rulesByModule['mod1']?.[0]?.id).toBe('r-fresh')
    })

    it('fetches from network when nothing is cached', async () => {
      seedReleasedModule('mod1')
      const contentStore = useContentStore()
      const entry = makeManifestEntry('mod1')
      contentStore.manifestByModule['mod1'] = entry

      mockGetCachedContent.mockResolvedValue(undefined)
      mockRequest.mockResolvedValue([makeRule('r1')])

      await contentStore.fetchRules('sys1', 'mod1')

      expect(mockRequest).toHaveBeenCalledWith({ method: 'GET', url: entry.content.rules })
      expect(contentStore.rulesByModule['mod1']).toHaveLength(1)
    })

    it('re-keys cached rules by rule_id and remaps snapshot parent_id', async () => {
      seedReleasedModule('mod1')
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod1'] = makeManifestEntry('mod1')

      mockGetCachedContent.mockResolvedValue({
        version_id: 'v1',
        items: [
          { ...makeRule('snap-parent'), rule_id: 'live-parent' },
          { ...makeRule('snap-child'), rule_id: 'live-child', parent_id: 'snap-parent' },
        ],
      })

      await contentStore.fetchRules('sys1', 'mod1')

      const rules = contentStore.rulesByModule['mod1']!
      expect(rules.map((r) => r.id)).toEqual(['live-parent', 'live-child'])
      expect(rules[1]?.parent_id).toBe('live-parent')
    })
  })

  describe('fetchIndexEntries', () => {
    it('serves from cache when the cached version_id matches the manifest', async () => {
      seedReleasedModule('mod1')
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod1'] = makeManifestEntry('mod1')

      mockGetCachedContent.mockResolvedValue({
        version_id: 'v1',
        items: [makeIndexEntry('e1')],
      })

      await contentStore.fetchIndexEntries('sys1', 'mod1')

      expect(mockGetCachedContent).toHaveBeenCalledWith('sys1', 'mod1', 'index')
      expect(mockRequest).not.toHaveBeenCalled()
      expect(contentStore.indexEntriesByModule['mod1']).toHaveLength(1)
    })

    it('falls through to network when the cached version_id differs', async () => {
      seedReleasedModule('mod1')
      const contentStore = useContentStore()
      const entry = makeManifestEntry('mod1', 'v2')
      contentStore.manifestByModule['mod1'] = entry

      mockGetCachedContent.mockResolvedValue({
        version_id: 'v1',
        items: [makeIndexEntry('e-stale')],
      })
      mockRequest.mockResolvedValue([makeIndexEntry('e-fresh')])

      await contentStore.fetchIndexEntries('sys1', 'mod1')

      expect(mockRequest).toHaveBeenCalledWith({ method: 'GET', url: entry.content.index })
      expect(contentStore.indexEntriesByModule['mod1']?.[0]?.id).toBe('e-fresh')
    })
  })

  describe('fetchGameData', () => {
    it('serves from cache when the cached version_id matches the manifest', async () => {
      seedReleasedModule('mod1')
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod1'] = makeManifestEntry('mod1')

      mockGetCachedContent.mockResolvedValue({
        version_id: 'v1',
        items: [makeGameDatum('gd1')],
      })

      await contentStore.fetchGameData('sys1', 'mod1')

      expect(mockGetCachedContent).toHaveBeenCalledWith('sys1', 'mod1', 'game-data')
      expect(mockRequest).not.toHaveBeenCalled()
      expect(contentStore.gameDataByModule['mod1']).toHaveLength(1)
    })

    it('falls through to network when the cached version_id differs', async () => {
      seedReleasedModule('mod1')
      const contentStore = useContentStore()
      const entry = makeManifestEntry('mod1', 'v2')
      contentStore.manifestByModule['mod1'] = entry

      mockGetCachedContent.mockResolvedValue({
        version_id: 'v1',
        items: [makeGameDatum('gd-stale')],
      })
      mockRequest.mockResolvedValue([makeGameDatum('gd-fresh')])

      await contentStore.fetchGameData('sys1', 'mod1')

      expect(mockRequest).toHaveBeenCalledWith({ method: 'GET', url: entry.content['game-data'] })
      expect(contentStore.gameDataByModule['mod1']?.[0]?.id).toBe('gd-fresh')
    })
  })
})
