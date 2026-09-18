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
import GameDataDrawerContent from '@/components/game-data/GameDataDrawerContent.vue'
import type { GameDatum, System, Module } from '@/types/domain'

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
      'content.view_live': true,
      'content.view_released': false,
      'content.edit': false,
      'version.publish': false,
      'version.amend_latest': false,
      'subscription.manage': false,
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

// ─── Store seeding ────────────────────────────────────────────────────────────

function seedSopProviders(): void {
  const systemStore = useSystemStore()
  const contentStore = useContentStore()

  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule('mod1', true), makeModule('mod2', false)]

  contentStore.rulesByModule['mod1'] = []
  contentStore.rulesByModule['mod2'] = []
  contentStore.indexEntriesByModule['mod1'] = []
  contentStore.indexEntriesByModule['mod2'] = []
  contentStore.gameDataByModule['mod1'] = [makeSop('sop1', 'mod1')]
  contentStore.gameDataByModule['mod2'] = [makeSop('sop2', 'mod2')]
}

function mountDrawerContent() {
  const pinia = createPinia()
  setActivePinia(pinia)
  seedSopProviders()
  return shallowMount(GameDataDrawerContent, {
    props: { mode: 'sop', isPinned: false, isDragging: false },
    global: { plugins: [pinia] },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GameDataDrawerContent — SOP rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPatch.mockReset()
  })

  it('renders every viewable module SOP without a provider picker', () => {
    const wrapper = mountDrawerContent()
    expect(wrapper.text()).not.toContain('Choose SOP')
    expect(wrapper.text()).not.toContain('Select an SOP to view.')
  })

  it('shows the empty state when no module provides an SOP', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const systemStore = useSystemStore()
    const contentStore = useContentStore()
    systemStore.currentSystem = makeSystem('sys1')
    systemStore.modulesBySystem['sys1'] = [makeModule('mod1', true)]
    contentStore.rulesByModule['mod1'] = []
    contentStore.indexEntriesByModule['mod1'] = []
    contentStore.gameDataByModule['mod1'] = []

    const wrapper = shallowMount(GameDataDrawerContent, {
      props: { mode: 'sop', isPinned: false, isDragging: false },
      global: { plugins: [pinia] },
    })

    expect(wrapper.text()).toContain('No sequence of play data available.')
  })
})
