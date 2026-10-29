import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { dialogStubs } from './helpers/dialogStubs'

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

import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useSystemStore } from '@/stores/system'
import { useContentStore } from '@/stores/content'
import { useShortcutStore } from '@/stores/shortcut'
import { useGameDataModalStore } from '@/stores/gameDataModal'
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

function makeModule(id: string, isCore: boolean): Module {
  return {
    id,
    system_id: 'sys1',
    slug: id,
    name: `Module ${id}`,
    description: null,
    config: null,
    is_core: isCore,
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

function makeDatum(
  id: string,
  type: GameDatum['type'],
  name: string,
  moduleId: string,
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

function seedContent() {
  const systemStore = useSystemStore()
  const contentStore = useContentStore()

  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule('mod1', true)]

  contentStore.rulesByModule['mod1'] = []
  contentStore.indexEntriesByModule['mod1'] = []
  contentStore.gameDataByModule['mod1'] = [
    makeDatum('t1', 'table', 'Fire Table', 'mod1'),
    makeDatum('sop1', 'sop', 'Fire SOP', 'mod1'),
  ]
}

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/systems/:systemId', name: 'system', component: { template: '<div />' } },
    ],
  })
}

function mountOverlay() {
  const pinia = createPinia()
  setActivePinia(pinia)
  seedContent()
  return mount(GlobalSearchOverlay, {
    global: {
      plugins: [pinia, buildRouter()],
      stubs: {
        ...dialogStubs(),
        IndexEntryResult: true,
      },
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

describe('GlobalSearchOverlay — tables group', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
  })

  it('renders the Tables group before the SOP group when both match', async () => {
    const wrapper = mountOverlay()

    await wrapper.find('input').setValue('fire')

    const headings = wrapper.findAll('p').map((p) => p.text().trim())
    expect(headings).toContain('Tables')
    expect(headings).toContain('SOP')
    expect(headings[0]).toBe('Tables')
    expect(headings.indexOf('Tables')).toBeLessThan(headings.indexOf('SOP'))
  })

  it('opens the table browser when a table result is clicked', async () => {
    const wrapper = mountOverlay()
    const gameDataModalStore = useGameDataModalStore()
    const shortcutStore = useShortcutStore()

    await wrapper.find('input').setValue('fire')

    const tableRow = wrapper
      .findAll('[role="button"]')
      .find((b) => b.text().includes('Fire Table'))
    expect(tableRow).toBeTruthy()

    await tableRow!.trigger('click')

    expect(gameDataModalStore.selectedTableId).toBe('t1')
    expect(gameDataModalStore.tableBrowserOpen).toBe(true)
    expect(shortcutStore.overlayOpen).toBe(false)
  })
})
