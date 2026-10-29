import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { dialogStubs } from './helpers/dialogStubs'

// ─── Mock useApi for all stores ───────────────────────────────────────────────
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

function passthrough(name: string) {
  return defineComponent({ name, template: '<div><slot /></div>' })
}

vi.mock('@/components/ui/tabs', () => ({
  Tabs: passthrough('Tabs'),
  TabsList: passthrough('TabsList'),
  TabsTrigger: passthrough('TabsTrigger'),
  TabsContent: passthrough('TabsContent'),
}))

import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import SopModal from '@/components/game-data/SopModal.vue'
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
      proofread_threshold: 3,
      cover_image: null,
    },
    permissions: { 'system.manage': false, 'membership.manage': false, 'module.create': false },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeCoreModule(id: string): Module {
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
      'content.view_live': true,
      'content.view_released': false,
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

function makeGameDatum(
  overrides: { id: string; type: GameDatum['type'] } & Partial<GameDatum>,
): GameDatum {
  return {
    module_id: 'mod1',
    slug: overrides.id,
    name: `Item ${overrides.id}`,
    content: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── Store seeding ────────────────────────────────────────────────────────────

/**
 * Seed a single core module (mod1) into the stores so that
 * `contentStore.singularGameData` reflects whatever is in
 * `gameDataByModule['mod1']`.
 */
function seedCoreModule(): void {
  const systemStore = useSystemStore()
  const contentStore = useContentStore()

  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeCoreModule('mod1')]
  contentStore.rulesByModule['mod1'] = []
  contentStore.indexEntriesByModule['mod1'] = []
  contentStore.gameDataByModule['mod1'] = []
}

// ─── Mount helper ─────────────────────────────────────────────────────────────

function mountSopModal() {
  const pinia = createPinia()
  setActivePinia(pinia)
  seedCoreModule()
  return {
    wrapper: mount(SopModal, {
      global: {
        plugins: [pinia],
        stubs: { ...dialogStubs(), SopViewer: true },
      },
    }),
    contentStore: useContentStore(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('SopModal — empty states', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
  })

  it('shows "No sequence of play data available." when singular game data is empty', () => {
    const { wrapper } = mountSopModal()
    expect(wrapper.text()).toContain('No sequence of play data available.')
  })

  it('hides the empty state when sop-type game data is present', async () => {
    const { wrapper, contentStore } = mountSopModal()
    contentStore.gameDataByModule['mod1'] = [makeGameDatum({ id: 'sop1', type: 'sop' })]
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('No sequence of play data available.')
  })

  it('still shows the empty state when only table data exists (no sops)', async () => {
    const { wrapper, contentStore } = mountSopModal()
    contentStore.gameDataByModule['mod1'] = [makeGameDatum({ id: 'tbl1', type: 'table' })]
    await wrapper.vm.$nextTick()
    // Table data does not count as a SOP
    expect(wrapper.text()).toContain('No sequence of play data available.')
  })
})
