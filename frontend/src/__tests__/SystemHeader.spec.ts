import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'

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

function passthrough(name: string) {
  return defineComponent({ name, template: '<div><slot /></div>' })
}

// ─── Stub the reka-ui-backed UI primitives ─────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  Button: defineComponent({
    name: 'ButtonStub',
    inheritAttrs: false,
    template: '<button v-bind="$attrs"><slot /></button>',
  }),
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: defineComponent({
    name: 'TabsStub',
    props: { modelValue: { type: String, default: '' } },
    emits: ['update:modelValue'],
    template: '<div data-test="view-switch"><slot /></div>',
  }),
  TabsList: passthrough('TabsListStub'),
  TabsTrigger: defineComponent({
    name: 'TabsTriggerStub',
    template: '<button><slot /></button>',
  }),
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: passthrough('SheetStub'),
  SheetContent: passthrough('SheetContentStub'),
  SheetTrigger: passthrough('SheetTriggerStub'),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: passthrough('DropdownMenuStub'),
  DropdownMenuContent: passthrough('DropdownMenuContentStub'),
  DropdownMenuItem: defineComponent({
    name: 'DropdownMenuItemStub',
    inheritAttrs: false,
    emits: ['click'],
    template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
  }),
  DropdownMenuLabel: passthrough('DropdownMenuLabelStub'),
  DropdownMenuSeparator: passthrough('DropdownMenuSeparatorStub'),
  DropdownMenuTrigger: passthrough('DropdownMenuTriggerStub'),
}))

vi.mock('@/components/systems/LeftPanelContent.vue', () => ({
  default: passthrough('LeftPanelContentStub'),
}))

vi.mock('@/components/systems/ManageMembersDialog.vue', () => ({
  default: passthrough('ManageMembersDialogStub'),
}))

vi.mock('@/components/systems/BrokenLinksDialog.vue', () => ({
  default: passthrough('BrokenLinksDialogStub'),
}))

vi.mock('@/components/systems/ProofreadDialog.vue', () => ({
  default: passthrough('ProofreadDialogStub'),
}))

vi.mock('@/components/systems/PinSystemControl.vue', () => ({
  default: defineComponent({
    name: 'PinSystemControlStub',
    props: { systemId: { type: String } },
    template: '<div data-test="pin-control" />',
  }),
}))

vi.mock('@/lib/gameDataTools', () => ({
  gameDataTools: vi.fn(() => []),
}))

import SystemHeader from '@/components/systems/SystemHeader.vue'
import { gameDataTools } from '@/lib/gameDataTools'
import type { GameDataTool } from '@/lib/gameDataTools'
import { useSystemStore } from '@/stores/system'
import { useContentStore } from '@/stores/content'
import { useMembershipStore } from '@/stores/membership'
import { useOnline } from '@/composables/useOnline'
import type { Module, ModulePermissions, System, Membership, GameDatum } from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSystem(id: string): System {
  return {
    id,
    slug: id,
    name: `System ${id}`,
    description: null,
    config: null,
    permissions: { 'system.manage': false, 'membership.manage': false, 'module.create': false },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makePermissions(overrides: Partial<ModulePermissions> = {}): ModulePermissions {
  return {
    'module.update': false,
    'module.delete': false,
    'content.view_live': false,
    'content.view_released': false,
    'content.edit': false,
    'content.proofread': false,
    'version.publish': false,
    'version.amend_latest': false,
    'subscription.manage': false,
    ...overrides,
  }
}

function makeModule(id: string, permissions: ModulePermissions, isCore = true): Module {
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
    permissions,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function seedSystem(permissions: Partial<ModulePermissions>): void {
  const systemStore = useSystemStore()
  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule('mod1', makePermissions(permissions))]
}

function makeMembership(bookmarks: Membership['config']): Membership {
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

function makeTable(id: string, moduleId: string, name: string): GameDatum {
  return {
    id,
    module_id: moduleId,
    type: 'table',
    slug: id,
    name,
    content: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeTool(id: string, label: string): GameDataTool {
  return { id, label, component: defineComponent({ name: `Tool-${id}` }) }
}

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/profile', name: 'profile', component: { template: '<div />' } },
      { path: '/settings', name: 'settings', component: { template: '<div />' } },
      { path: '/systems/:systemId', name: 'system', component: { template: '<div />' } },
    ],
  })
}

function mountHeader() {
  return mount(SystemHeader, {
    props: {
      selectedRule: null,
      getModuleRules: () => [],
      buildTopLevelRules: () => [],
    },
    global: { plugins: [buildRouter()] },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

describe('SystemHeader — draft/release switch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    vi.mocked(gameDataTools).mockReturnValue([])
    useOnline().online.value = true
  })

  describe('view mode switch', () => {
    it('shows the switch when the user can view live content', () => {
      seedSystem({ 'content.view_live': true, 'content.view_released': true })
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="view-switch"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Draft')
      expect(wrapper.text()).toContain('Release')
    })

    it('hides the switch when the user has no live access', () => {
      seedSystem({ 'content.view_released': true })
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="view-switch"]').exists()).toBe(false)
    })

    it('hides the switch when offline', () => {
      seedSystem({ 'content.view_live': true, 'content.view_released': true })
      useOnline().online.value = false
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="view-switch"]').exists()).toBe(false)
    })
  })

  describe('pin control in system menu', () => {
    it('is present regardless of view mode', () => {
      seedSystem({ 'content.view_live': true, 'content.view_released': true })
      const contentStore = useContentStore()
      contentStore.setViewMode('draft')
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="pin-control"]').exists()).toBe(true)
    })

    it('is present for a player', () => {
      seedSystem({ 'content.view_released': true })
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="pin-control"]').exists()).toBe(true)
    })
  })

  describe('proofread menu item', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      mockGet.mockReset()
      useOnline().online.value = true
    })

    it('shows Proofread for a proofreader in draft view', () => {
      seedSystem({ 'content.proofread': true })
      const wrapper = mountHeader()

      expect(wrapper.text()).toContain('Proofread')
    })

    it('hides Proofread for a plain player', () => {
      seedSystem({ 'content.view_released': true })
      const wrapper = mountHeader()

      expect(wrapper.text()).not.toContain('Proofread')
    })
  })

  describe('table bookmarks', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      mockGet.mockReset()
      useOnline().online.value = true
    })

    it('renders no bookmark buttons when there are no table bookmarks', () => {
      seedSystem({ 'content.view_released': true })
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="inline-bookmark"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="bookmark-more"]').exists()).toBe(false)
    })

    it('renders a pinned table as a short slug button with the full name as tooltip', () => {
      seedSystem({ 'content.view_released': true })
      const contentStore = useContentStore()
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = []
      contentStore.gameDataByModule['mod1'] = [makeTable('t1', 'mod1', 'Firepower Table')]
      useMembershipStore().setMembership('sys1', makeMembership({ bookmarks: [{ type: 'table', id: 't1' }] }))
      const wrapper = mountHeader()

      const button = wrapper.find('[data-test="inline-bookmark"]')
      expect(button.exists()).toBe(true)
      expect(button.text()).toContain('t1')
      expect(button.attributes('title')).toBe('Firepower Table')
    })

    it('does not render unavailable table bookmarks in the toolbar', () => {
      seedSystem({ 'content.view_released': true })
      useMembershipStore().setMembership(
        'sys1',
        makeMembership({ bookmarks: [{ type: 'table', id: '01HZ8Q9X7K3M2N1P0R5T6V4W8Y' }] }),
      )
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="inline-bookmark"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="bookmark-more"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain('01HZ8Q9X7K3M2N1P0R5T6V4W8Y')
    })
  })

  describe('table bookmarks overflow', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      mockGet.mockReset()
      useOnline().online.value = true
    })

    it('renders a bookmark button per pinned table', () => {
      seedSystem({ 'content.view_released': true })
      const contentStore = useContentStore()
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = []
      contentStore.gameDataByModule['mod1'] = Array.from({ length: 6 }, (_, i) =>
        makeTable(`t${i + 1}`, 'mod1', `Table ${i + 1}`),
      )
      useMembershipStore().setMembership(
        'sys1',
        makeMembership({
          bookmarks: Array.from({ length: 6 }, (_, i) => ({ type: 'table', id: `t${i + 1}` })),
        }),
      )
      const wrapper = mountHeader()

      expect(wrapper.findAll('[data-test="inline-bookmark"]')).toHaveLength(6)
    })
  })

  describe('inline tools', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      mockGet.mockReset()
      useOnline().online.value = true
    })

    it('renders a button per tool', () => {
      seedSystem({ 'content.view_released': true })
      vi.mocked(gameDataTools).mockReturnValue([
        makeTool('t1', 'Tool One'),
        makeTool('t2', 'Tool Two'),
        makeTool('t3', 'Tool Three'),
        makeTool('t4', 'Tool Four'),
        makeTool('t5', 'Tool Five'),
        makeTool('t6', 'Tool Six'),
      ])
      const wrapper = mountHeader()

      expect(wrapper.findAll('[data-test="inline-tool"]')).toHaveLength(6)
    })
  })

  describe('module selector in system menu', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      mockGet.mockReset()
      mockPatch.mockReset()
      useOnline().online.value = true
    })

    function seedSelectableModules(nonCore: string[]): void {
      const systemStore = useSystemStore()
      systemStore.currentSystem = makeSystem('sys1')
      const perms = makePermissions({ 'content.view_released': true })
      systemStore.modulesBySystem['sys1'] = [
        makeModule('core', perms, true),
        ...nonCore.map((id) => makeModule(id, perms, false)),
      ]
      useMembershipStore().setMembership('sys1', makeMembership({}))
    }

    it('renders no module items when only one non-core module exists', () => {
      seedSelectableModules(['exp1'])
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="system-menu"]').exists()).toBe(true)
      expect(wrapper.find('[data-module-id]').exists()).toBe(false)
    })

    it('renders module items in the system menu when multiple non-core modules exist', () => {
      seedSelectableModules(['exp1', 'exp2'])
      const wrapper = mountHeader()

      expect(wrapper.find('[data-module-id="all"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Module exp1')
      expect(wrapper.text()).toContain('Module exp2')
    })

    it('shows the selected module name as the active label', () => {
      seedSelectableModules(['exp1', 'exp2'])
      useMembershipStore().setMembership('sys1', makeMembership({ selected_module_id: 'exp2' }))
      const wrapper = mountHeader()

      expect(wrapper.text()).toContain('Active module: Module exp2')
    })

    it('selecting a module persists the choice and re-scopes the active modules', async () => {
      seedSelectableModules(['exp1', 'exp2'])
      mockPatch.mockResolvedValue({
        ok: true,
        data: { data: makeMembership({ selected_module_id: 'exp1' }) },
      })

      const wrapper = mountHeader()
      const contentStore = useContentStore()

      expect(contentStore.activeModules.map((m) => m.id)).toEqual(['core', 'exp1', 'exp2'])

      await wrapper.find('[data-module-id="exp1"]').trigger('click')
      await flushPromises()

      expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
        config: { selected_module_id: 'exp1' },
      })
      expect(contentStore.activeModules.map((m) => m.id)).toEqual(['core', 'exp1'])
    })

    it('selecting "all modules" clears the selection', async () => {
      seedSelectableModules(['exp1', 'exp2'])
      useMembershipStore().setMembership('sys1', makeMembership({ selected_module_id: 'exp1' }))
      mockPatch.mockResolvedValue({
        ok: true,
        data: { data: makeMembership({ selected_module_id: null }) },
      })

      const wrapper = mountHeader()
      const contentStore = useContentStore()

      await wrapper.find('[data-module-id="all"]').trigger('click')
      await flushPromises()

      expect(mockPatch).toHaveBeenCalledWith('/me/memberships/sys1', {
        config: { selected_module_id: null },
      })
      expect(contentStore.activeModules.map((m) => m.id)).toEqual(['core', 'exp1', 'exp2'])
    })
  })

  describe('system name link', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      mockGet.mockReset()
      useOnline().online.value = true
    })

    it('navigates to the root TOC when clicked', async () => {
      seedSystem({ 'content.view_released': true })
      const router = buildRouter()
      const push = vi.spyOn(router, 'push')

      const wrapper = mount(SystemHeader, {
        props: {
          selectedRule: null,
          getModuleRules: () => [],
          buildTopLevelRules: () => [],
        },
        global: { plugins: [router] },
      })

      await wrapper.find('button[title="Table of contents"]').trigger('click')

      expect(push).toHaveBeenCalledWith({ name: 'system', params: { systemId: 'sys1' } })
    })
  })
})
