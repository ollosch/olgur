import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent } from 'vue'
import { shallowMount, mount, flushPromises } from '@vue/test-utils'
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

// ─── Mock the sonner toast ────────────────────────────────────────────────────
const { mockToastSuccess } = vi.hoisted(() => ({ mockToastSuccess: vi.fn() }))

vi.mock('vue-sonner', () => ({
  toast: { success: mockToastSuccess, error: vi.fn() },
}))

import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useGameDataPanelStore } from '@/stores/gameDataPanel'
import SopModal from '@/components/game-data/SopModal.vue'
import SopViewer from '@/components/game-data/SopViewer.vue'
import SopListBlock from '@/components/game-data/SopListBlock.vue'
import type {
  GameDatum,
  System,
  Module,
  Membership,
  MembershipConfig,
  SopContent,
  SopList,
} from '@/types/domain'

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

function makeMembership(config: MembershipConfig = {}): Membership {
  return {
    id: 'mem1',
    system_id: 'sys1',
    user_id: 'user1',
    admin: false,
    config,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeSopContent(): SopContent {
  return {
    topics: {
      groups: [
        { slug: 'night', label: 'Night', ref: 'E1', topics: [] },
        {
          slug: 'theatre',
          label: 'Theatre',
          ref: 'G',
          topics: [
            { slug: 'japanese', label: 'Japanese', ref: 'G1' },
            { slug: 'marine', label: 'Marine', ref: 'G14' },
          ],
        },
      ],
    },
    pre_game: {
      blocks: [
        { type: 'paragraph', runs: [{ text: 'Set up forces.', tags: [] }] },
        {
          type: 'list',
          items: [
            {
              runs: [{ text: 'Choose sides.', tags: [] }],
              children: {
                type: 'list',
                ordered: true,
                items: [{ runs: [{ text: 'Roll initiative.', tags: [] }] }],
              },
            },
          ],
        },
      ],
    },
    phases: [
      {
        slug: 'rally',
        label: 'Rally Phase',
        parts: [
          {
            slug: 'start',
            label: 'START of RPh',
            steps: [
              {
                mpath: '1.1',
                player: 'A',
                blocks: [
                  {
                    type: 'paragraph',
                    runs: [
                      { text: 'Remove PF markers.', tags: [] },
                      { text: ' Japanese units +2.', tags: ['japanese'] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }
}

function makeNestedList(): SopList {
  return {
    type: 'list',
    ordered: false,
    items: [
      {
        runs: [{ text: 'Outer item', tags: [] }],
        children: {
          type: 'list',
          ordered: true,
          items: [{ runs: [{ text: 'Inner ordered item', tags: [] }] }],
        },
      },
    ],
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

function passthrough(name: string) {
  return defineComponent({ name, template: '<div><slot /></div>' })
}

function mountSopModal() {
  const pinia = createPinia()
  setActivePinia(pinia)
  seedSopProviders()
  return mount(SopModal, {
    global: {
      plugins: [pinia],
      stubs: {
        ...dialogStubs(),
        SopViewer: true,
        Tabs: passthrough('Tabs'),
        TabsList: passthrough('TabsList'),
        TabsTrigger: passthrough('TabsTrigger'),
        TabsContent: passthrough('TabsContent'),
      },
    },
  })
}

function mountSop(
  content: SopContent,
  opts: { ignored?: string[]; bold?: string[]; expandedPhases?: string[]; preGame?: boolean } = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const systemStore = useSystemStore()
  systemStore.currentSystem = makeSystem('sys1')

  const membershipStore = useMembershipStore()
  membershipStore.setMembership(
    'sys1',
    makeMembership({ ignored_tags: opts.ignored ?? [], bold_tags: opts.bold ?? [] }),
  )

  const panel = useGameDataPanelStore()
  const state = panel.getSopState('sop1')
  for (const slug of opts.expandedPhases ?? []) state.expandedPhases.add(slug)
  if (opts.preGame) state.preGameExpanded = true

  return shallowMount(SopViewer, {
    props: { sopId: 'sop1', content },
    global: { plugins: [pinia], renderStubDefaultSlot: true },
  })
}

function findButtonByText(wrapper: ReturnType<typeof shallowMount>, text: string) {
  return wrapper.findAll('button').find((b) => b.text().trim() === text)
}

// ─────────────────────────────────────────────────────────────────────────────

describe('SopModal — SOP rendering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPatch.mockReset()
  })

  it('renders the singular SOP without a provider picker', () => {
    const wrapper = mountSopModal()
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

    const wrapper = mount(SopModal, {
      global: {
        plugins: [pinia],
        stubs: {
          ...dialogStubs(),
          SopViewer: true,
          Tabs: passthrough('Tabs'),
          TabsList: passthrough('TabsList'),
          TabsTrigger: passthrough('TabsTrigger'),
          TabsContent: passthrough('TabsContent'),
        },
      },
    })

    expect(wrapper.text()).toContain('No sequence of play data available.')
  })
})

describe('SopViewer — new SOP schema', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPatch.mockReset()
    mockToastSuccess.mockReset()
  })

  it('renders a paragraph and hands list blocks to the recursive list component', () => {
    const wrapper = mountSop(makeSopContent(), { preGame: true })

    expect(wrapper.text()).toContain('Set up forces.')

    const listStub = wrapper.findComponent(SopListBlock)
    expect(listStub.exists()).toBe(true)
    const list = listStub.props('list') as SopList
    expect(list.items[0]?.runs[0]?.text).toBe('Choose sides.')
  })

  it('hides a run when all of its tags are ignored', () => {
    const wrapper = mountSop(makeSopContent(), { ignored: ['japanese'], expandedPhases: ['rally'] })

    expect(wrapper.text()).toContain('Remove PF markers.')
    expect(wrapper.text()).not.toContain('Japanese units +2.')
  })

  it('bolds a run when one of its tags is bold', () => {
    const wrapper = mountSop(makeSopContent(), { bold: ['japanese'], expandedPhases: ['rally'] })

    const strongs = wrapper.findAll('strong')
    const boldRun = strongs.find((s) => s.text().includes('Japanese units +2.'))
    expect(boldRun).toBeTruthy()
  })

  it('renders a nested list recursively', () => {
    const wrapper = mount(SopListBlock, {
      props: { list: makeNestedList(), ignoredTags: [], boldTags: [] },
    })

    expect(wrapper.find('ul').exists()).toBe(true)
    expect(wrapper.find('ol').exists()).toBe(true)
    expect(wrapper.text()).toContain('Outer item')
    expect(wrapper.text()).toContain('Inner ordered item')
  })

  it('cycles a topic through normal → bold → hidden and persists both lists', async () => {
    mockPatch.mockResolvedValue({ ok: true, data: { data: makeMembership() } })
    const wrapper = mountSop(makeSopContent())

    // Pre-expand the "theatre" group so its sub-topics are visible.
    useGameDataPanelStore().getSopState('sop1').expandedGroups.add('theatre')

    await findButtonByText(wrapper, 'Topics')!.trigger('click')

    const japanese = wrapper.find('button[data-topic="japanese"]')
    const marine = wrapper.find('button[data-topic="marine"]')

    expect(japanese.attributes('data-state')).toBe('normal')

    // japanese → bold (one click)
    await japanese.trigger('click')
    expect(japanese.attributes('data-state')).toBe('bold')

    // marine → hidden (two clicks)
    await marine.trigger('click')
    expect(marine.attributes('data-state')).toBe('bold')
    await marine.trigger('click')
    expect(marine.attributes('data-state')).toBe('hidden')

    await findButtonByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
      config: { ignored_tags: ['marine'], bold_tags: ['japanese'] },
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Topics saved.')
  })
})
