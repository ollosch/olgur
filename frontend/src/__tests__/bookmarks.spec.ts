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
import type { System, Membership, BookmarkEntry } from '@/types/domain'

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

// ─────────────────────────────────────────────────────────────────────────────

describe('useBookmarkStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPost.mockReset()
    mockDel.mockReset()
    mockPatch.mockReset()
    mockPut.mockReset()
  })

  function setup(bookmarks: BookmarkEntry[] = []) {
    const systemStore = useSystemStore()
    systemStore.currentSystem = makeSystem('sys1')
    const membershipStore = useMembershipStore()
    membershipStore.setMembership('sys1', makeMembershipWithBookmarks('sys1', bookmarks))
    const bookmarkStore = useBookmarkStore()
    return { systemStore, membershipStore, bookmarkStore }
  }

  const types: Array<BookmarkEntry['type']> = ['rule', 'table', 'unit']

  it.each(types)('round-trips a %s bookmark through the membership config', async (type) => {
    const { membershipStore, bookmarkStore } = setup()
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
})
