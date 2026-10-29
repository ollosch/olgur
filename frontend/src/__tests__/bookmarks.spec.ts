import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mock useApi for all stores that import it ────────────────────────────────
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDel = vi.fn()
const mockPatch = vi.fn()
const mockPut = vi.fn()
const mockLoading = ref(false)
const featureState = vi.hoisted(() => ({ aslTables: true, afvVsAfv: true }))

vi.mock('@/lib/features', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/features')>()
  return { ...actual, FEATURES: featureState }
})

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    post: mockPost,
    del: mockDel,
    patch: mockPatch,
    put: mockPut,
    loading: mockLoading,
  })),
}))

import { useBookmarkStore } from '@/stores/bookmarks'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useContentStore } from '@/stores/content'
import type { System, Membership, BookmarkEntry, Module, GameDatum, Rule } from '@/types/domain'

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

function makeMembership(systemId: string): Membership {
  return {
    id: 'mem1',
    system_id: systemId,
    user_id: 'user1',
    admin: false,
    config: { bookmarks: [] },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeMembershipWithBookmarks(systemId: string, bookmarks: BookmarkEntry[]): Membership {
  return { ...makeMembership(systemId), config: { bookmarks } }
}

function makeModule(id: string, live = false): Module {
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
    permissions: {
      'module.update': false,
      'module.delete': false,
      'content.view_live': live,
      'content.view_released': !live,
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

function makeRule(id: string, moduleId: string): Rule {
  return {
    id,
    module_id: moduleId,
    parent_id: null,
    number: '1.1',
    title: `Rule ${id}`,
    content: '',
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeTable(
  id: string,
  moduleId: string,
  name: string,
  type: GameDatum['type'] = 'table',
): GameDatum {
  return {
    id,
    module_id: moduleId,
    type,
    slug: id,
    name,
    content: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useBookmarkStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPost.mockReset()
    mockDel.mockReset()
    mockPatch.mockReset()
    mockPut.mockReset()
    featureState.aslTables = true
    featureState.afvVsAfv = true
  })

  function setup(bookmarks: BookmarkEntry[] = []) {
    const systemStore = useSystemStore()
    systemStore.currentSystem = makeSystem('sys1')
    const membershipStore = useMembershipStore()
    membershipStore.setMembership('sys1', makeMembershipWithBookmarks('sys1', bookmarks))
    const bookmarkStore = useBookmarkStore()
    return { systemStore, membershipStore, bookmarkStore }
  }

  function seedResolvedContent(live = false): void {
    const systemStore = useSystemStore()
    systemStore.modulesBySystem['sys1'] = [makeModule('mod1', live)]
    const contentStore = useContentStore()
    contentStore.rulesByModule['mod1'] = [makeRule('id-1', 'mod1'), makeRule('r1', 'mod1')]
    contentStore.indexEntriesByModule['mod1'] = []
    contentStore.gameDataByModule['mod1'] = [
      makeTable('id-1', 'mod1', 'Firepower Table'),
      makeTable('u1', 'mod1', 'Panther', 'vehicle'),
    ]
  }

  const types: Array<BookmarkEntry['type']> = ['rule', 'table', 'unit']

  it.each(types)('round-trips a %s bookmark through the membership config', async (type) => {
    const { membershipStore, bookmarkStore } = setup()
    seedResolvedContent()
    const updated = makeMembershipWithBookmarks('sys1', [{ type, id: 'id-1' }])
    mockPatch.mockResolvedValue({ ok: true, data: { data: updated } })

    await bookmarkStore.addBookmark(type, 'id-1')

    expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
      config: { bookmarks: [{ type, id: 'id-1' }] },
    })
    expect(bookmarkStore.bookmarks).toEqual([{ type, id: 'id-1' }])
    expect(membershipStore.membership?.config?.bookmarks).toEqual([{ type, id: 'id-1' }])
  })

  it('does not duplicate an existing bookmark of the same type and id', async () => {
    const { bookmarkStore } = setup([{ type: 'table', id: 't1' }])

    await bookmarkStore.addBookmark('table', 't1')

    expect(mockPatch).not.toHaveBeenCalled()
  })

  it('removes a bookmark by type and id', async () => {
    const { bookmarkStore } = setup([
      { type: 'rule', id: 'r1' },
      { type: 'table', id: 't1' },
    ])
    const updated = makeMembershipWithBookmarks('sys1', [{ type: 'rule', id: 'r1' }])
    mockPatch.mockResolvedValue({ ok: true, data: { data: updated } })

    await bookmarkStore.removeBookmark('table', 't1')

    expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
      config: { bookmarks: [{ type: 'rule', id: 'r1' }] },
    })
    expect(bookmarkStore.bookmarks).toEqual([{ type: 'rule', id: 'r1' }])
  })

  it('reports isBookmarked for table and unit entries', () => {
    const { bookmarkStore } = setup([
      { type: 'table', id: 't1' },
      { type: 'unit', id: 'u1' },
    ])

    expect(bookmarkStore.isBookmarked('table', 't1')).toBe(true)
    expect(bookmarkStore.isBookmarked('unit', 'u1')).toBe(true)
    expect(bookmarkStore.isBookmarked('rule', 'r1')).toBe(false)
  })

  it('resolves table bookmarks to their table names', () => {
    const { bookmarkStore } = setup([{ type: 'table', id: 't1' }])
    seedResolvedContent()
    const contentStore = useContentStore()
    contentStore.gameDataByModule['mod1'] = [makeTable('t1', 'mod1', 'Firepower Table')]

    const resolved = bookmarkStore.resolvedBookmarks
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.label).toBe('Firepower Table')
    expect(resolved[0]?.available).toBe(true)
    expect(resolved[0]?.entry).toEqual({ type: 'table', id: 't1' })
  })

  it('resolves unit bookmarks from game data instead of the raw id', () => {
    const { bookmarkStore } = setup([{ type: 'unit', id: 'u1' }])
    seedResolvedContent()

    const resolved = bookmarkStore.resolvedBookmarks
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.label).toBe('Panther')
    expect(resolved[0]?.sublabel).toBeNull()
    expect(resolved[0]?.available).toBe(true)
  })

  it('marks a released target available and a missing target unavailable', () => {
    const { bookmarkStore } = setup([
      { type: 'rule', id: 'r1' },
      { type: 'rule', id: 'missing' },
    ])
    seedResolvedContent()

    const available = bookmarkStore.resolvedBookmarks.find((b) => b.entry.id === 'r1')
    const missing = bookmarkStore.resolvedBookmarks.find((b) => b.entry.id === 'missing')

    expect(available?.available).toBe(true)
    expect(available?.label).toBe('1.1 Rule r1')
    expect(missing?.available).toBe(false)
    expect(missing?.label).toBe('Unavailable bookmark')
    expect(missing?.label).not.toBe('missing')
  })

  it('treats targets present in the live source as available', () => {
    const { bookmarkStore } = setup([{ type: 'rule', id: 'r1' }])
    seedResolvedContent(true)

    expect(bookmarkStore.resolvedBookmarks[0]?.available).toBe(true)
    expect(bookmarkStore.availableBookmarks).toHaveLength(1)
  })

  it('excludes unavailable targets from availableBookmarks', () => {
    const { bookmarkStore } = setup([
      { type: 'table', id: 't1' },
      { type: 'table', id: 'missing' },
    ])
    seedResolvedContent()
    const contentStore = useContentStore()
    contentStore.gameDataByModule['mod1'] = [makeTable('t1', 'mod1', 'Firepower Table')]

    expect(bookmarkStore.availableBookmarks.map((b) => b.entry.id)).toEqual(['t1'])
  })

  it('refuses to add a bookmark whose target is not loaded', async () => {
    const { bookmarkStore } = setup()
    seedResolvedContent()

    await bookmarkStore.addBookmark('rule', 'missing')

    expect(mockPatch).not.toHaveBeenCalled()
    expect(bookmarkStore.bookmarks).toEqual([])
  })

  it('refuses to add a bookmark while the module serves live content', async () => {
    const { bookmarkStore } = setup()
    seedResolvedContent(true)

    await bookmarkStore.addBookmark('rule', 'r1')

    expect(mockPatch).not.toHaveBeenCalled()
    expect(bookmarkStore.bookmarks).toEqual([])
  })

  it('hides ASL table bookmarks while retaining the stored entry when the flag is off', () => {
    featureState.aslTables = false
    const { bookmarkStore } = setup([
      { type: 'table', id: 'asl1' },
      { type: 'table', id: 'matrix1' },
    ])
    seedResolvedContent()
    const contentStore = useContentStore()
    contentStore.gameDataByModule['mod1'] = [
      { ...makeTable('asl1', 'mod1', 'IFT'), content: { kind: 'ift' } },
      { ...makeTable('matrix1', 'mod1', 'Firepower Table'), content: { kind: 'matrix' } },
    ]

    expect(bookmarkStore.resolvedBookmarks.map((b) => b.entry.id)).toEqual(['matrix1'])
    expect(bookmarkStore.availableBookmarks.map((b) => b.entry.id)).toEqual(['matrix1'])
    expect(bookmarkStore.bookmarks.map((b) => b.id)).toEqual(['asl1', 'matrix1'])
  })

  it('falls back to an unavailable label for a table bookmark with no matching content', () => {
    const { bookmarkStore } = setup([{ type: 'table', id: 'missing' }])

    const resolved = bookmarkStore.resolvedBookmarks
    expect(resolved).toHaveLength(1)
    expect(resolved[0]?.label).toBe('Unavailable bookmark')
    expect(resolved[0]?.available).toBe(false)
  })
})
