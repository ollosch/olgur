import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const mockGet = vi.fn()
const mockPatch = vi.fn()
const mockLoading = ref(false)

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    patch: mockPatch,
    loading: mockLoading,
  })),
}))

import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import GameDataDrawerContent from '@/components/game-data/GameDataDrawerContent.vue'
import type { GameDatum, System, Module, Membership } from '@/types/domain'

// ─── Fixture helpers ──────────────────────────────────────────────────────────

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

function makeModule(id: string, isCore: boolean): Module {
  return {
    id,
    system_id: 'sys1',
    slug: id,
    name: `Module ${id}`,
    description: null,
    config: null,
    tools: [],
    is_core: isCore,
    sort_order: 0,
    permissions: {
      'module.update': false,
      'module.delete': false,
      'content.view_live': false,
      'content.view_released': false,
      'content.edit': false,
      'version.publish': false,
      'version.amend_latest': false,
      'subscription.manage': false,
      'module.activate': false,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeSop(id: string, moduleId: string): GameDatum {
  return {
    id,
    module_id: moduleId,
    type: 'sop',
    slug: id,
    name: `SOP ${id}`,
    content: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeMembership(systemId: string, selectedSopModuleId: string | null): Membership {
  return {
    id: `mem-${systemId}`,
    system_id: systemId,
    user_id: 'user1',
    admin: false,
    config: {
      active_module_ids: ['mod2'],
      selected_sop_module_id: selectedSopModuleId,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

// ─── Store seeding ────────────────────────────────────────────────────────────

function seedTwoSopProviders(selectedSopModuleId: string | null): void {
  const systemStore = useSystemStore()
  const contentStore = useContentStore()
  const membershipStore = useMembershipStore()

  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule('mod1', true), makeModule('mod2', false)]

  contentStore.rulesByModule['mod1'] = []
  contentStore.rulesByModule['mod2'] = []
  contentStore.indexEntriesByModule['mod1'] = []
  contentStore.indexEntriesByModule['mod2'] = []
  contentStore.gameDataByModule['mod1'] = [makeSop('sop1', 'mod1')]
  contentStore.gameDataByModule['mod2'] = [makeSop('sop2', 'mod2')]

  membershipStore.membershipsBySystem['sys1'] = makeMembership('sys1', selectedSopModuleId)
}

function mountDrawerContent() {
  const pinia = createPinia()
  setActivePinia(pinia)
  seedTwoSopProviders(null)
  return {
    wrapper: shallowMount(GameDataDrawerContent, {
      props: { mode: 'sop', isPinned: false, isDragging: false },
      global: { plugins: [pinia] },
    }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GameDataDrawerContent — SOP provider selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPatch.mockReset()
  })

  it('prompts for selection when several active modules provide an SOP', () => {
    const { wrapper } = mountDrawerContent()
    expect(wrapper.text()).toContain('Choose SOP')
    expect(wrapper.text()).toContain('Select an SOP to view.')
  })

  it('shows the selected provider without the selection prompt', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    seedTwoSopProviders('mod2')

    const wrapper = shallowMount(GameDataDrawerContent, {
      props: { mode: 'sop', isPinned: false, isDragging: false },
      global: { plugins: [pinia] },
    })

    expect(wrapper.text()).not.toContain('Select an SOP to view.')
  })

  it('persists the chosen provider in membership config', async () => {
    mockPatch.mockResolvedValue({
      ok: true,
      data: { data: makeMembership('sys1', 'mod2') },
    })

    const { wrapper } = mountDrawerContent()

    const buttons = wrapper.findAll('button')
    const providerButton = buttons.find((b) => b.text().includes('Module mod2'))
    expect(providerButton).toBeTruthy()
    await providerButton!.trigger('click')

    expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
      config: { selected_sop_module_id: 'mod2' },
    })
  })
})
