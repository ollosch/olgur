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

import { useMembershipStore } from '@/stores/membership'
import type { Membership, Subscription } from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function makeSubscription(moduleId: string, editor = false): Subscription {
  return {
    id: `sub-${moduleId}`,
    module_id: moduleId,
    user_id: 'user1',
    editor,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useMembershipStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPost.mockReset()
    mockDel.mockReset()
    mockPatch.mockReset()
    mockPut.mockReset()
  })

  describe('fetchMemberships', () => {
    it('indexes memberships by system id', async () => {
      mockGet.mockResolvedValue({ ok: true, data: { data: [makeMembership('sys1')] } })

      const membershipStore = useMembershipStore()
      await membershipStore.fetchMemberships()

      expect(mockGet).toHaveBeenCalledWith('/me/memberships')
      expect(membershipStore.membershipsBySystem['sys1']).toEqual(makeMembership('sys1'))
    })
  })

  describe('fetchSubscriptions', () => {
    it('indexes subscriptions by module id', async () => {
      mockGet.mockResolvedValue({ ok: true, data: { data: [makeSubscription('mod1')] } })

      const membershipStore = useMembershipStore()
      await membershipStore.fetchSubscriptions()

      expect(mockGet).toHaveBeenCalledWith('/me/subscriptions')
      expect(membershipStore.subscriptions['mod1']).toEqual({ id: 'sub-mod1', editor: false })
    })
  })

  describe('updateMembership', () => {
    it('patches the membership config and updates local state', async () => {
      const updated = {
        ...makeMembership('sys1'),
        config: { bookmarks: [{ type: 'rule', id: 'r1' }] },
      }
      mockPatch.mockResolvedValue({ ok: true, data: { data: updated } })

      const membershipStore = useMembershipStore()
      await membershipStore.updateMembership('sys1', {
        bookmarks: [{ type: 'rule', id: 'r1' }],
      })

      expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
        config: { bookmarks: [{ type: 'rule', id: 'r1' }] },
      })
      expect(membershipStore.membershipsBySystem['sys1']).toEqual(updated)
    })
  })

  describe('selectModule', () => {
    it('patches selected_module_id on the membership config', async () => {
      const updated = {
        ...makeMembership('sys1'),
        config: { bookmarks: [], selected_module_id: 'mod2' },
      }
      mockPatch.mockResolvedValue({ ok: true, data: { data: updated } })

      const membershipStore = useMembershipStore()
      await membershipStore.selectModule('sys1', 'mod2')

      expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
        config: { selected_module_id: 'mod2' },
      })
      expect(membershipStore.membershipsBySystem['sys1']).toEqual(updated)
    })

    it('clears selected_module_id when passed null', async () => {
      const updated = {
        ...makeMembership('sys1'),
        config: { bookmarks: [], selected_module_id: null },
      }
      mockPatch.mockResolvedValue({ ok: true, data: { data: updated } })

      const membershipStore = useMembershipStore()
      await membershipStore.selectModule('sys1', null)

      expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
        config: { selected_module_id: null },
      })
    })
  })
})
