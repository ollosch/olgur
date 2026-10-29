import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { dialogStubs } from './helpers/dialogStubs'

// ─── Mock useApi for all stores that import it ────────────────────────────────
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
import { useBookmarkStore } from '@/stores/bookmarks'
import { useOnline } from '@/composables/useOnline'
import TableBrowserModal from '@/components/game-data/TableBrowserModal.vue'
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
      proofread_threshold: 3,
      cover_image: null,
    },
    permissions: { 'system.manage': false, 'membership.manage': false, 'module.create': false },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeModule(id: string, isCore: boolean, live = false): Module {
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

function makeDatum(
  id: string,
  type: GameDatum['type'],
  moduleId: string,
  content: Record<string, unknown> = {},
): GameDatum {
  return {
    id,
    module_id: moduleId,
    type,
    slug: id,
    name: `${type} ${id}`,
    content,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeMembership(bookmarks: Membership['config'] = {}): Membership {
  return {
    id: 'mem1',
    system_id: 'sys1',
    user_id: 'user1',
    admin: false,
    config: bookmarks,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function passthrough(name: string) {
  return defineComponent({ name, template: '<div><slot /></div>' })
}

function mountBrowser(seed: () => void) {
  const pinia = createPinia()
  setActivePinia(pinia)
  seed()
  return mount(TableBrowserModal, {
    global: {
      plugins: [pinia],
      stubs: {
        ...dialogStubs(),
        MatrixTable: passthrough('MatrixTable'),
        AttributeTable: passthrough('AttributeTable'),
        ModifierList: passthrough('ModifierList'),
      },
    },
  })
}

function seedContent() {
  const systemStore = useSystemStore()
  const contentStore = useContentStore()

  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule('mod1', true)]

  contentStore.rulesByModule['mod1'] = []
  contentStore.indexEntriesByModule['mod1'] = []
  contentStore.gameDataByModule['mod1'] = [
    makeDatum('t1', 'table', 'mod1', { kind: 'matrix', rows: [], columns: [] }),
    makeDatum('t2', 'table', 'mod1'),
    makeDatum('sop1', 'sop', 'mod1'),
    makeDatum('v1', 'vehicle', 'mod1'),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────

describe('TableBrowserModal — listing and bookmarks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPatch.mockReset()
    useOnline().online.value = true
  })

  it('lists only table-type game data from the active set', () => {
    const wrapper = mountBrowser(seedContent)

    const rows = wrapper.findAll('[data-table-id]')
    expect(rows.map((r) => r.attributes('data-table-id'))).toEqual(['t1', 't2'])
    expect(wrapper.text()).not.toContain('sop sop1')
    expect(wrapper.text()).not.toContain('vehicle v1')
  })

  it('shows an empty state when no tables exist', () => {
    const wrapper = mountBrowser(() => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()
      systemStore.currentSystem = makeSystem('sys1')
      systemStore.modulesBySystem['sys1'] = [makeModule('mod1', true)]
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = []
      contentStore.gameDataByModule['mod1'] = [makeDatum('sop1', 'sop', 'mod1')]
    })

    expect(wrapper.text()).toContain('No tables available.')
  })

  it('filters the table list by name as the search box is typed', async () => {
    const wrapper = mountBrowser(seedContent)

    await wrapper.find('[data-test="table-search"]').setValue('t2')

    const rows = wrapper.findAll('[data-table-id]')
    expect(rows.map((r) => r.attributes('data-table-id'))).toEqual(['t2'])
  })

  it('selects a table when its row is clicked', async () => {
    const wrapper = mountBrowser(seedContent)

    await wrapper.find('[data-table-id="t1"]').trigger('click')

    expect(wrapper.find('[data-rule-context]').exists()).toBe(true)
    expect(wrapper.text()).toContain('table t1')
  })

  it('contains horizontal scroll within the render area', async () => {
    const wrapper = mountBrowser(seedContent)

    await wrapper.find('[data-table-id="t1"]').trigger('click')

    const renderArea = wrapper.find('[data-test="table-render-area"]')
    expect(renderArea.exists()).toBe(true)
    expect(renderArea.classes()).toContain('overflow-auto')
    expect(renderArea.classes()).toContain('min-w-0')
  })

  it('pins and unpins a table via the bookmark store', async () => {
    const wrapper = mountBrowser(() => {
      seedContent()
      useMembershipStore().setMembership('sys1', makeMembership({ bookmarks: [] }))
    })

    mockPatch.mockResolvedValue({
      ok: true,
      data: { data: makeMembership({ bookmarks: [{ type: 'table', id: 't1' }] }) },
    })

    const bookmarkStore = useBookmarkStore()
    expect(bookmarkStore.isBookmarked('table', 't1')).toBe(false)

    await wrapper.find('[data-pin="t1"]').trigger('click')
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
      config: { bookmarks: [{ type: 'table', id: 't1' }] },
    })
    expect(bookmarkStore.isBookmarked('table', 't1')).toBe(true)

    mockPatch.mockResolvedValue({
      ok: true,
      data: { data: makeMembership({ bookmarks: [] }) },
    })

    await wrapper.find('[data-pin="t1"]').trigger('click')
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
      config: { bookmarks: [] },
    })
    expect(bookmarkStore.isBookmarked('table', 't1')).toBe(false)
  })

  it('hides the pin button when the table module serves live content', () => {
    const wrapper = mountBrowser(() => {
      seedContent()
      useSystemStore().modulesBySystem['sys1'] = [makeModule('mod1', true, true)]
    })

    expect(wrapper.find('[data-pin="t1"]').exists()).toBe(false)
  })
})
