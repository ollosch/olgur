import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
    'version.publish': false,
    'version.amend_latest': false,
    'subscription.manage': false,
    ...overrides,
  }
}

function makeModule(
  id: string,
  isCore = true,
  permissions: ModulePermissions = makePermissions(),
): Module {
  return {
    id,
    system_id: 'sys1',
    slug: id,
    name: `Module ${id}`,
    description: null,
    config: null,
    is_core: isCore,
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

// ─── Context seeders ──────────────────────────────────────────────────────────

/**
 * Seed the current system with modules whose permission maps drive content
 * source selection. `modules` is a map of module id → permission overrides.
 */
function seedModules(modules: Record<string, Partial<ModulePermissions>>): void {
  const systemStore = useSystemStore()
  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = Object.entries(modules).map(([id, perms]) =>
    makeModule(id, true, makePermissions(perms)),
  )
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useContentStore — manifest & content routing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockRequest.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── fetchManifest ───────────────────────────────────────────────────────────

  describe('fetchManifest', () => {
    it('calls the manifest endpoint and stores entries keyed by module_id', async () => {
      seedModules({ mod1: {} })
      const contentStore = useContentStore()

      const entry = makeManifestEntry('mod1')
      mockGet.mockResolvedValue({ ok: true, data: { data: [entry] } })

      await contentStore.fetchManifest('sys1')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/manifest')
      expect(contentStore.manifestByModule['mod1']).toEqual(entry)
    })

    it('stores multiple manifest entries indexed by their module_id', async () => {
      seedModules({ mod1: {} })
      const contentStore = useContentStore()

      const entries = [makeManifestEntry('mod1'), makeManifestEntry('mod2')]
      mockGet.mockResolvedValue({ ok: true, data: { data: entries } })

      await contentStore.fetchManifest('sys1')

      expect(contentStore.manifestByModule['mod1']).toEqual(entries[0])
      expect(contentStore.manifestByModule['mod2']).toEqual(entries[1])
    })

    it('leaves manifestByModule unchanged when the API request fails', async () => {
      seedModules({ mod1: {} })
      const contentStore = useContentStore()

      mockGet.mockResolvedValue({ ok: false, errors: {} })

      await contentStore.fetchManifest('sys1')

      expect(contentStore.manifestByModule).toEqual({})
    })
  })

  // ── per-module content source ───────────────────────────────────────────────

  describe('per-module content source', () => {
    it('an editor loads live for their module but released for a subscriber-only module', async () => {
      seedModules({
        mod1: { 'content.view_live': true },
        mod2: { 'content.view_released': true },
      })
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod2'] = makeManifestEntry('mod2')

      mockGet.mockResolvedValue({ ok: true, data: { data: [makeRule('r1')] } })
      mockRequest.mockResolvedValue([makeRule('r2')])

      await contentStore.fetchRules('sys1', 'mod1')
      await contentStore.fetchRules('sys1', 'mod2')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/modules/mod1/rules')
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: makeManifestEntry('mod2').content.rules,
      })
    })
  })

  // ── fetchRules ──────────────────────────────────────────────────────────────

  describe('fetchRules', () => {
    it('view_live module fetches from the live endpoint, ignoring the manifest', async () => {
      seedModules({ mod1: { 'content.view_live': true } })
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod1'] = makeManifestEntry('mod1')

      mockGet.mockResolvedValue({ ok: true, data: { data: [makeRule('r1')] } })

      await contentStore.fetchRules('sys1', 'mod1')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/modules/mod1/rules')
      expect(mockRequest).not.toHaveBeenCalled()
      expect(contentStore.rulesByModule['mod1']).toHaveLength(1)
    })

    it('view_released module with manifest entry fetches from the manifest URL', async () => {
      seedModules({ mod1: { 'content.view_released': true } })
      const contentStore = useContentStore()
      const entry = makeManifestEntry('mod1')
      contentStore.manifestByModule['mod1'] = entry

      mockRequest.mockResolvedValue([makeRule('r1')])

      await contentStore.fetchRules('sys1', 'mod1')

      expect(mockRequest).toHaveBeenCalledWith({ method: 'GET', url: entry.content.rules })
      expect(mockGet).not.toHaveBeenCalled()
      expect(contentStore.rulesByModule['mod1']).toHaveLength(1)
    })

    it('view_released module without a manifest entry skips loading', async () => {
      seedModules({ mod1: { 'content.view_released': true } })
      const contentStore = useContentStore()

      await contentStore.fetchRules('sys1', 'mod1')

      expect(mockRequest).not.toHaveBeenCalled()
      expect(mockGet).not.toHaveBeenCalled()
      expect(contentStore.rulesByModule['mod1']).toBeUndefined()
    })

    it('a module with neither view permission is unavailable and never fetched', async () => {
      seedModules({ mod1: {} })
      const contentStore = useContentStore()

      await contentStore.fetchRules('sys1', 'mod1')

      expect(mockRequest).not.toHaveBeenCalled()
      expect(mockGet).not.toHaveBeenCalled()
      expect(contentStore.rulesByModule['mod1']).toBeUndefined()
    })

    it('normalises <br> → newline in rule content from released files', async () => {
      seedModules({ mod1: { 'content.view_released': true } })
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod1'] = makeManifestEntry('mod1')

      const rule: Rule = { ...makeRule('r1'), content: 'line1<br>line2' }
      mockRequest.mockResolvedValue([rule])

      await contentStore.fetchRules('sys1', 'mod1')

      expect(contentStore.rulesByModule['mod1']?.[0]?.content).toBe('line1\nline2')
    })
  })

  // ── fetchIndexEntries ────────────────────────────────────────────────────────

  describe('fetchIndexEntries', () => {
    it('view_released module with manifest entry fetches from the manifest URL', async () => {
      seedModules({ mod1: { 'content.view_released': true } })
      const contentStore = useContentStore()
      const entry = makeManifestEntry('mod1')
      contentStore.manifestByModule['mod1'] = entry

      mockRequest.mockResolvedValue([makeIndexEntry('e1')])

      await contentStore.fetchIndexEntries('sys1', 'mod1')

      expect(mockRequest).toHaveBeenCalledWith({ method: 'GET', url: entry.content.index })
      expect(mockGet).not.toHaveBeenCalled()
      expect(contentStore.indexEntriesByModule['mod1']).toHaveLength(1)
    })

    it('view_live module uses the live index-entries endpoint', async () => {
      seedModules({ mod1: { 'content.view_live': true } })
      const contentStore = useContentStore()

      mockGet.mockResolvedValue({ ok: true, data: { data: [] } })

      await contentStore.fetchIndexEntries('sys1', 'mod1')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/modules/mod1/index-entries')
      expect(mockRequest).not.toHaveBeenCalled()
    })

    it('a module without permissions skips loading', async () => {
      seedModules({ mod1: {} })
      const contentStore = useContentStore()

      await contentStore.fetchIndexEntries('sys1', 'mod1')

      expect(mockRequest).not.toHaveBeenCalled()
      expect(contentStore.indexEntriesByModule['mod1']).toBeUndefined()
    })
  })

  // ── fetchGameData ────────────────────────────────────────────────────────────

  describe('fetchGameData', () => {
    it('view_released module with manifest entry fetches from the manifest URL', async () => {
      seedModules({ mod1: { 'content.view_released': true } })
      const contentStore = useContentStore()
      const entry = makeManifestEntry('mod1')
      contentStore.manifestByModule['mod1'] = entry

      mockRequest.mockResolvedValue([makeGameDatum('gd1')])

      await contentStore.fetchGameData('sys1', 'mod1')

      expect(mockRequest).toHaveBeenCalledWith({ method: 'GET', url: entry.content['game-data'] })
      expect(mockGet).not.toHaveBeenCalled()
      expect(contentStore.gameDataByModule['mod1']).toHaveLength(1)
    })

    it('view_live module uses the live game-data endpoint', async () => {
      seedModules({ mod1: { 'content.view_live': true } })
      const contentStore = useContentStore()

      mockGet.mockResolvedValue({ ok: true, data: { data: [] } })

      await contentStore.fetchGameData('sys1', 'mod1')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/modules/mod1/game-data')
      expect(mockRequest).not.toHaveBeenCalled()
    })

    it('a module without permissions skips loading', async () => {
      seedModules({ mod1: {} })
      const contentStore = useContentStore()

      await contentStore.fetchGameData('sys1', 'mod1')

      expect(mockRequest).not.toHaveBeenCalled()
      expect(contentStore.gameDataByModule['mod1']).toBeUndefined()
    })
  })

  // ── clear ────────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('resets manifestByModule together with all other content state', () => {
      seedModules({ mod1: {} })
      const contentStore = useContentStore()

      contentStore.manifestByModule['mod1'] = makeManifestEntry('mod1')
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = []
      contentStore.gameDataByModule['mod1'] = []

      contentStore.clear()

      expect(contentStore.manifestByModule).toEqual({})
      expect(contentStore.rulesByModule).toEqual({})
      expect(contentStore.indexEntriesByModule).toEqual({})
      expect(contentStore.gameDataByModule).toEqual({})
    })
  })
})
