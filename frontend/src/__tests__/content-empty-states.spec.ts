import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

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
    config: { system_structure: 'core_plus_many', sort_rules_by: 'number', toc_depth: 3, cover_image: null },
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
 * `contentStore.allGameData` reflects whatever is in `gameDataByModule['mod1']`.
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

function mountDrawerContent(mode: 'tables' | 'sop') {
  const pinia = createPinia()
  setActivePinia(pinia)
  seedCoreModule()
  return {
    wrapper: shallowMount(GameDataDrawerContent, {
      props: {
        mode,
        isPinned: false,
        isDragging: false,
      },
      global: { plugins: [pinia] },
    }),
    contentStore: useContentStore(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GameDataDrawerContent — empty states', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
  })

  // ── tables mode ─────────────────────────────────────────────────────────────

  describe('tables mode', () => {
    it('shows "No tables available." when allGameData is empty', () => {
      const { wrapper } = mountDrawerContent('tables')
      expect(wrapper.text()).toContain('No tables available.')
    })

    it('hides the empty state when table-type game data is present', async () => {
      const { wrapper, contentStore } = mountDrawerContent('tables')
      contentStore.gameDataByModule['mod1'] = [makeGameDatum({ id: 'tbl1', type: 'table' })]
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).not.toContain('No tables available.')
    })

    it('still shows empty state when only sop data exists (no tables)', async () => {
      const { wrapper, contentStore } = mountDrawerContent('tables')
      contentStore.gameDataByModule['mod1'] = [makeGameDatum({ id: 'sop1', type: 'sop' })]
      await wrapper.vm.$nextTick()
      // SOP data does not count as a table
      expect(wrapper.text()).toContain('No tables available.')
    })
  })

  // ── sop mode ────────────────────────────────────────────────────────────────

  describe('sop mode', () => {
    it('shows the SOP empty state when allGameData is empty', () => {
      const { wrapper } = mountDrawerContent('sop')
      expect(wrapper.text()).toContain('No sequence of play data available.')
    })

    it('hides the SOP empty state when sop-type game data is present', async () => {
      const { wrapper, contentStore } = mountDrawerContent('sop')
      contentStore.gameDataByModule['mod1'] = [makeGameDatum({ id: 'sop1', type: 'sop' })]
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).not.toContain('No sequence of play data available.')
    })

    it('still shows SOP empty state when only table data exists (no sops)', async () => {
      const { wrapper, contentStore } = mountDrawerContent('sop')
      contentStore.gameDataByModule['mod1'] = [makeGameDatum({ id: 'tbl1', type: 'table' })]
      await wrapper.vm.$nextTick()
      // Table data does not count as a SOP
      expect(wrapper.text()).toContain('No sequence of play data available.')
    })
  })
})
