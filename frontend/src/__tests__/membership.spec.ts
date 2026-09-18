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
import { useSystemStore } from '@/stores/system'
import type { Membership, System } from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSystem(id: string, globalRuleNumbers = true): System {
  return {
    id,
    slug: id,
    name: `System ${id}`,
    description: null,
    config: {
      global_rule_numbers: globalRuleNumbers,
      sort_rules_by: 'number',
      toc_depth: 3,
      cover_image: null,
    },
    permissions: { 'system.manage': false, 'membership.manage': false, 'module.create': false },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeMembership(systemId: string, activeModuleIds: string[]): Membership {
  return {
    id: 'mem1',
    system_id: systemId,
    user_id: 'user1',
    admin: false,
    config: { active_module_ids: activeModuleIds },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
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

  // ── activateModule ──────────────────────────────────────────────────────────

  describe('activateModule', () => {
    it('calls the correct POST endpoint to activate the module', async () => {
      mockPost.mockResolvedValue({ ok: true })
      mockGet.mockResolvedValue({ ok: true, data: { data: [] } })

      const systemStore = useSystemStore()
      const membershipStore = useMembershipStore()

      systemStore.systems = [makeSystem('sys1')]

      await membershipStore.activateModule('sys1', 'mod1')

      expect(mockPost).toHaveBeenCalledWith('/systems/sys1/modules/mod1/activate')
    })

    it('does NOT deactivate existing modules before activating', async () => {
      mockPost.mockResolvedValue({ ok: true })
      mockGet.mockResolvedValue({ ok: true, data: { data: [] } })

      const systemStore = useSystemStore()
      const membershipStore = useMembershipStore()

      systemStore.systems = [makeSystem('sys1')]
      membershipStore.membershipsBySystem['sys1'] = makeMembership('sys1', ['existing-mod'])

      await membershipStore.activateModule('sys1', 'new-mod')

      expect(mockDel).not.toHaveBeenCalled()
      expect(mockPost).toHaveBeenCalledWith('/systems/sys1/modules/new-mod/activate')
    })

    it('calls refreshMembership after activating, updating local membership state', async () => {
      const refreshedMembership = makeMembership('sys1', ['new-mod'])
      mockPost.mockResolvedValue({ ok: true })
      mockGet.mockResolvedValue({ ok: true, data: { data: [refreshedMembership] } })

      const systemStore = useSystemStore()
      const membershipStore = useMembershipStore()

      systemStore.systems = [makeSystem('sys1')]

      await membershipStore.activateModule('sys1', 'new-mod')

      expect(mockGet).toHaveBeenCalledWith('/me/memberships')
      expect(membershipStore.membershipsBySystem['sys1']).toEqual(refreshedMembership)
    })
  })
})
