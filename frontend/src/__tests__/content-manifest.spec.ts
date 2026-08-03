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
// vi.hoisted() ensures the variable is available before vi.mock() factories run.
const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }))

vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>()
  return { ...actual, request: mockRequest }
})

import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { useAuthStore } from '@/stores/auth'
import { useMembershipStore } from '@/stores/membership'
import type { User, System, Module, Membership, ManifestEntry, Rule, IndexEntry, GameDatum } from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user1',
    name: 'Test User',
    email: 'test@example.com',
    super_admin: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeSystem(id: string): System {
  return {
    id,
    slug: id,
    name: `System ${id}`,
    description: null,
    config: { system_structure: 'core_plus_many', sort_rules_by: 'number', toc_depth: 3, cover_image: null },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeModule(id: string, isCore = true): Module {
  return {
    id,
    system_id: 'sys1',
    slug: id,
    name: `Module ${id}`,
    description: null,
    config: null,
    is_core: isCore,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeMembership(admin = false): Membership {
  return {
    id: 'mem1',
    system_id: 'sys1',
    user_id: 'user1',
    admin,
    config: { active_module_ids: ['mod1'] },
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
    files: {
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

function seedPlayerContext(): void {
  const authStore = useAuthStore()
  const systemStore = useSystemStore()
  const membershipStore = useMembershipStore()

  authStore.user = makeUser({ super_admin: false })
  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule('mod1')]
  membershipStore.membershipsBySystem['sys1'] = makeMembership(false)
  membershipStore.subscriptions['mod1'] = { id: 'sub1', editor: false }
}

function seedDesignerContext(): void {
  const authStore = useAuthStore()
  const systemStore = useSystemStore()
  const membershipStore = useMembershipStore()

  authStore.user = makeUser({ super_admin: true })
  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule('mod1')]
  membershipStore.membershipsBySystem['sys1'] = makeMembership(false)
  membershipStore.subscriptions['mod1'] = { id: 'sub1', editor: false }
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
      seedPlayerContext()
      const contentStore = useContentStore()

      const entry = makeManifestEntry('mod1')
      mockGet.mockResolvedValue({ ok: true, data: { data: [entry] } })

      await contentStore.fetchManifest('sys1')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/manifest')
      expect(contentStore.manifestByModule['mod1']).toEqual(entry)
    })

    it('stores multiple manifest entries indexed by their module_id', async () => {
      seedPlayerContext()
      const contentStore = useContentStore()

      const entries = [makeManifestEntry('mod1'), makeManifestEntry('mod2')]
      mockGet.mockResolvedValue({ ok: true, data: { data: entries } })

      await contentStore.fetchManifest('sys1')

      expect(contentStore.manifestByModule['mod1']).toEqual(entries[0])
      expect(contentStore.manifestByModule['mod2']).toEqual(entries[1])
    })

    it('leaves manifestByModule unchanged when the API request fails', async () => {
      seedPlayerContext()
      const contentStore = useContentStore()

      mockGet.mockResolvedValue({ ok: false, errors: {} })

      await contentStore.fetchManifest('sys1')

      expect(contentStore.manifestByModule).toEqual({})
    })
  })

  // ── isDesigner ──────────────────────────────────────────────────────────────

  describe('isDesigner', () => {
    it('is true when user.super_admin is true', () => {
      seedDesignerContext()
      const contentStore = useContentStore()
      expect(contentStore.isDesigner).toBe(true)
    })

    it('is true when membership.admin is true', () => {
      const authStore = useAuthStore()
      const systemStore = useSystemStore()
      const membershipStore = useMembershipStore()

      authStore.user = makeUser({ super_admin: false })
      systemStore.currentSystem = makeSystem('sys1')
      systemStore.modulesBySystem['sys1'] = [makeModule('mod1')]
      membershipStore.membershipsBySystem['sys1'] = makeMembership(true)

      const contentStore = useContentStore()
      expect(contentStore.isDesigner).toBe(true)
    })

    it('is true when any subscription in the current system has editor: true', () => {
      const authStore = useAuthStore()
      const systemStore = useSystemStore()
      const membershipStore = useMembershipStore()

      authStore.user = makeUser({ super_admin: false })
      systemStore.currentSystem = makeSystem('sys1')
      systemStore.modulesBySystem['sys1'] = [makeModule('mod1')]
      membershipStore.membershipsBySystem['sys1'] = makeMembership(false)
      membershipStore.subscriptions['mod1'] = { id: 'sub1', editor: true }

      const contentStore = useContentStore()
      expect(contentStore.isDesigner).toBe(true)
    })

    it('is false when an editor subscription belongs to a different system', () => {
      const authStore = useAuthStore()
      const systemStore = useSystemStore()
      const membershipStore = useMembershipStore()

      authStore.user = makeUser({ super_admin: false })
      systemStore.currentSystem = makeSystem('sys1')
      // sys1 only has mod1; mod2 belongs to a different system
      systemStore.modulesBySystem['sys1'] = [makeModule('mod1')]
      membershipStore.membershipsBySystem['sys1'] = makeMembership(false)
      // editor of mod2 which is NOT in sys1
      membershipStore.subscriptions['mod2'] = { id: 'sub2', editor: true }

      const contentStore = useContentStore()
      expect(contentStore.isDesigner).toBe(false)
    })

    it('is false for a regular player', () => {
      seedPlayerContext()
      const contentStore = useContentStore()
      expect(contentStore.isDesigner).toBe(false)
    })

    it('is false when user is null', () => {
      const authStore = useAuthStore()
      authStore.user = null
      const contentStore = useContentStore()
      expect(contentStore.isDesigner).toBe(false)
    })
  })

  // ── fetchRules ──────────────────────────────────────────────────────────────

  describe('fetchRules', () => {
    it('player with manifest entry: fetches from the manifest rules URL, not the live endpoint', async () => {
      seedPlayerContext()
      const contentStore = useContentStore()

      const entry = makeManifestEntry('mod1')
      contentStore.manifestByModule['mod1'] = entry

      const rules = [makeRule('r1')]
      mockRequest.mockResolvedValue(rules)

      await contentStore.fetchRules('sys1', 'mod1')

      expect(mockRequest).toHaveBeenCalledWith({ method: 'GET', url: entry.files.rules })
      expect(mockGet).not.toHaveBeenCalled()
      expect(contentStore.rulesByModule['mod1']).toHaveLength(1)
    })

    it('player with no manifest entry: skips loading and leaves state undefined', async () => {
      seedPlayerContext()
      const contentStore = useContentStore()
      // No entry seeded into manifestByModule

      await contentStore.fetchRules('sys1', 'mod1')

      expect(mockRequest).not.toHaveBeenCalled()
      expect(mockGet).not.toHaveBeenCalled()
      expect(contentStore.rulesByModule['mod1']).toBeUndefined()
    })

    it('designer: always fetches from the live endpoint, ignoring the manifest', async () => {
      seedDesignerContext()
      const contentStore = useContentStore()

      // Even with a manifest entry present, the designer path must use live API
      contentStore.manifestByModule['mod1'] = makeManifestEntry('mod1')

      const rules = [makeRule('r1')]
      mockGet.mockResolvedValue({ ok: true, data: { data: rules } })

      await contentStore.fetchRules('sys1', 'mod1')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/modules/mod1/rules')
      expect(mockRequest).not.toHaveBeenCalled()
    })

    it('player: normalises <br> → newline in rule content from external files', async () => {
      seedPlayerContext()
      const contentStore = useContentStore()

      const entry = makeManifestEntry('mod1')
      contentStore.manifestByModule['mod1'] = entry

      const rule: Rule = { ...makeRule('r1'), content: 'line1<br>line2' }
      mockRequest.mockResolvedValue([rule])

      await contentStore.fetchRules('sys1', 'mod1')

      expect(contentStore.rulesByModule['mod1']?.[0]?.content).toBe('line1\nline2')
    })
  })

  // ── fetchIndexEntries ────────────────────────────────────────────────────────

  describe('fetchIndexEntries', () => {
    it('player with manifest entry: fetches from the manifest index URL', async () => {
      seedPlayerContext()
      const contentStore = useContentStore()

      const entry = makeManifestEntry('mod1')
      contentStore.manifestByModule['mod1'] = entry

      mockRequest.mockResolvedValue([makeIndexEntry('e1')])

      await contentStore.fetchIndexEntries('sys1', 'mod1')

      expect(mockRequest).toHaveBeenCalledWith({ method: 'GET', url: entry.files.index })
      expect(mockGet).not.toHaveBeenCalled()
      expect(contentStore.indexEntriesByModule['mod1']).toHaveLength(1)
    })

    it('player with no manifest entry: skips loading', async () => {
      seedPlayerContext()
      const contentStore = useContentStore()

      await contentStore.fetchIndexEntries('sys1', 'mod1')

      expect(mockRequest).not.toHaveBeenCalled()
      expect(contentStore.indexEntriesByModule['mod1']).toBeUndefined()
    })

    it('designer: uses the live index-entries endpoint', async () => {
      seedDesignerContext()
      const contentStore = useContentStore()

      mockGet.mockResolvedValue({ ok: true, data: { data: [] } })

      await contentStore.fetchIndexEntries('sys1', 'mod1')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/modules/mod1/index-entries')
      expect(mockRequest).not.toHaveBeenCalled()
    })
  })

  // ── fetchGameData ────────────────────────────────────────────────────────────

  describe('fetchGameData', () => {
    it('player with manifest entry: fetches from the manifest game-data URL', async () => {
      seedPlayerContext()
      const contentStore = useContentStore()

      const entry = makeManifestEntry('mod1')
      contentStore.manifestByModule['mod1'] = entry

      mockRequest.mockResolvedValue([makeGameDatum('gd1')])

      await contentStore.fetchGameData('sys1', 'mod1')

      expect(mockRequest).toHaveBeenCalledWith({ method: 'GET', url: entry.files['game-data'] })
      expect(mockGet).not.toHaveBeenCalled()
      expect(contentStore.gameDataByModule['mod1']).toHaveLength(1)
    })

    it('player with no manifest entry: skips loading', async () => {
      seedPlayerContext()
      const contentStore = useContentStore()

      await contentStore.fetchGameData('sys1', 'mod1')

      expect(mockRequest).not.toHaveBeenCalled()
      expect(contentStore.gameDataByModule['mod1']).toBeUndefined()
    })

    it('designer: uses the live game-data endpoint', async () => {
      seedDesignerContext()
      const contentStore = useContentStore()

      mockGet.mockResolvedValue({ ok: true, data: { data: [] } })

      await contentStore.fetchGameData('sys1', 'mod1')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/modules/mod1/game-data')
      expect(mockRequest).not.toHaveBeenCalled()
    })
  })

  // ── clear ────────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('resets manifestByModule together with all other content state', () => {
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
