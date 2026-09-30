import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'

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
  DropdownMenuItem: passthrough('DropdownMenuItemStub'),
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

vi.mock('@/components/systems/PinSystemControl.vue', () => ({
  default: defineComponent({
    name: 'PinSystemControlStub',
    props: { systemId: { type: String } },
    template: '<div data-test="pin-control" />',
  }),
}))

import SystemHeader from '@/components/systems/SystemHeader.vue'
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

function makeModule(id: string, permissions: ModulePermissions): Module {
  return {
    id,
    system_id: 'sys1',
    slug: id,
    name: `Module ${id}`,
    description: null,
    config: null,
    is_core: true,
    sort_order: 0,
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

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/login', name: 'login', component: { template: '<div />' } },
      { path: '/profile', name: 'profile', component: { template: '<div />' } },
      { path: '/settings', name: 'settings', component: { template: '<div />' } },
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

  describe('pin control gating', () => {
    it('hides the pin control in draft view for a live-capable user', () => {
      seedSystem({ 'content.view_live': true, 'content.view_released': true })
      const contentStore = useContentStore()
      contentStore.setViewMode('draft')
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="pin-control"]').exists()).toBe(false)
    })

    it('shows the pin control in release view for a live-capable user', () => {
      seedSystem({ 'content.view_live': true, 'content.view_released': true })
      const contentStore = useContentStore()
      contentStore.setViewMode('release')
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="pin-control"]').exists()).toBe(true)
    })

    it('shows the pin control for a player regardless of view mode', () => {
      seedSystem({ 'content.view_released': true })
      const wrapper = mountHeader()

      expect(wrapper.find('[data-test="pin-control"]').exists()).toBe(true)
    })
  })

  describe('table bookmarks dropdown', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      mockGet.mockReset()
      useOnline().online.value = true
    })

    it('shows the empty state when there are no table bookmarks', () => {
      seedSystem({ 'content.view_released': true })
      const wrapper = mountHeader()

      expect(wrapper.text()).toContain('No table bookmarks yet')
    })

    it('lists pinned tables', () => {
      seedSystem({ 'content.view_released': true })
      const contentStore = useContentStore()
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = []
      contentStore.gameDataByModule['mod1'] = [makeTable('t1', 'mod1', 'Firepower Table')]
      useMembershipStore().setMembership('sys1', makeMembership({ bookmarks: [{ type: 'table', id: 't1' }] }))
      const wrapper = mountHeader()

      expect(wrapper.text()).toContain('Firepower Table')
      expect(wrapper.text()).not.toContain('No table bookmarks yet')
    })
  })
})
