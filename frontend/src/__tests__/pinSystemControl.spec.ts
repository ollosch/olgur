import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { closeIdb } from '@/lib/idb'

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

// ─── Mock the authenticated request() from http.ts ────────────────────────────
const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }))

vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>()
  return { ...actual, request: mockRequest }
})

// ─── Stub the reka-ui-backed UI primitives ─────────────────────────────────────
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenuCheckboxItem: defineComponent({
    name: 'DropdownMenuCheckboxItemStub',
    props: {
      modelValue: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
    },
    emits: ['update:modelValue'],
    template:
      '<button type="button" role="menuitemcheckbox" :aria-checked="String(modelValue)" :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)"><slot /></button>',
  }),
}))

// ─── Mock the sonner toast used for pin feedback ───────────────────────────────
const { mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

vi.mock('vue-sonner', () => ({
  toast: { error: mockToastError, success: mockToastSuccess },
}))

import PinSystemControl from '@/components/systems/PinSystemControl.vue'
import { useCacheStore } from '@/stores/cacheStore'
import { useContentStore } from '@/stores/content'
import { useOnline } from '@/composables/useOnline'
import type {
  System,
  Module,
  ManifestEntry,
  Rule,
  IndexEntry,
  GameDatum,
  ModulePermissions,
} from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function makeModule(id: string): Module {
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
    permissions: makePermissions({ 'content.view_released': true }),
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeManifestEntry(moduleId: string, versionString = '1.0'): ManifestEntry {
  return {
    module_id: moduleId,
    version_id: 'v1',
    version_string: versionString,
    released_at: '2024-01-01T00:00:00Z',
    revision: 0,
    content: {
      rules: `https://cdn.example.com/${moduleId}/rules.json`,
      index: `https://cdn.example.com/${moduleId}/index.json`,
      'game-data': `https://cdn.example.com/${moduleId}/game-data.json`,
    },
  }
}

function makeRule(id: string): Rule {
  return {
    id,
    module_id: 'mod1',
    parent_id: null,
    number: `1.${id}`,
    title: `Rule ${id}`,
    content: 'text',
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeIndexEntry(id: string): IndexEntry {
  return {
    id,
    module_id: 'mod1',
    parent_id: null,
    term: `Term ${id}`,
    definition: 'A definition.',
    notes: null,
    relations: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeGameDatum(id: string): GameDatum {
  return {
    id,
    module_id: 'mod1',
    type: 'table',
    slug: id,
    name: `Table ${id}`,
    content: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function seedApi(system: System, modules: Module[], entries: ManifestEntry[]): void {
  mockGet.mockImplementation((url: string) => {
    if (url === `/systems/${system.id}`) {
      return Promise.resolve({ ok: true, data: { data: system } })
    }
    if (url === `/systems/${system.id}/modules`) {
      return Promise.resolve({ ok: true, data: { data: modules } })
    }
    if (url === `/systems/${system.id}/manifest`) {
      return Promise.resolve({
        ok: true,
        data: { data: { system_id: system.id, name: system.name, modules: entries } },
      })
    }
    return Promise.resolve({ ok: false, errors: {} })
  })

  mockRequest.mockImplementation((config: { url: string }) => {
    if (config.url.endsWith('rules.json')) return Promise.resolve([makeRule('r1')])
    if (config.url.endsWith('index.json')) return Promise.resolve([makeIndexEntry('e1')])
    if (config.url.endsWith('game-data.json')) return Promise.resolve([makeGameDatum('gd1')])
    return Promise.resolve([])
  })
}

function meta(overrides: Partial<{ versionString: string; size: number }> = {}) {
  return {
    systemId: 'sys1',
    name: 'System sys1',
    versionString: overrides.versionString ?? '1.0',
    cachedAt: 0,
    size: overrides.size ?? 1024,
  }
}

async function resetIndexedDb(): Promise<void> {
  await closeIdb()
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('olgur-offline')
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PinSystemControl', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockRequest.mockReset()
    mockToastError.mockReset()
    mockToastSuccess.mockReset()
    useOnline().online.value = true
    await resetIndexedDb()
  })

  afterEach(async () => {
    useOnline().online.value = true
    vi.restoreAllMocks()
    await resetIndexedDb()
  })

  function mountControl() {
    return mount(PinSystemControl, { props: { systemId: 'sys1' } })
  }

  it('renders unchecked and labelled "Make available offline" when not cached', () => {
    useContentStore().manifestByModule['mod1'] = makeManifestEntry('mod1')

    const wrapper = mountControl()

    expect(wrapper.find('[role="menuitemcheckbox"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.find('[role="menuitemcheckbox"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('Make available offline')
  })

  it('disables the item and explains when there is no released version to cache', () => {
    const wrapper = mountControl()

    const item = wrapper.find('[role="menuitemcheckbox"]')
    expect(item.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('No released version to cache')
    expect(item.attributes('title')).toBe('No released version to cache')
  })

  it('disables the item when offline and not cached', () => {
    useOnline().online.value = false
    useContentStore().manifestByModule['mod1'] = makeManifestEntry('mod1')

    const wrapper = mountControl()

    const item = wrapper.find('[role="menuitemcheckbox"]')
    expect(item.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Offline — connect to cache')
  })

  it('keeps unpin enabled when cached even while offline', () => {
    useOnline().online.value = false
    useCacheStore().cachedSystems = [meta()]

    const wrapper = mountControl()

    const item = wrapper.find('[role="menuitemcheckbox"]')
    expect(item.attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('Delete from cache')
  })

  it('renders checked when the system is cached', () => {
    useCacheStore().cachedSystems = [meta()]

    const wrapper = mountControl()

    expect(wrapper.find('[role="menuitemcheckbox"]').attributes('aria-checked')).toBe('true')
  })

  it('reads "Delete from cache" when the system is cached', () => {
    useCacheStore().cachedSystems = [meta()]

    const wrapper = mountControl()

    expect(wrapper.text()).toContain('Delete from cache')
    expect(wrapper.text()).not.toContain('Make available offline')
  })

  it('pins the system when toggled on', async () => {
    seedApi(makeSystem('sys1'), [makeModule('mod1')], [makeManifestEntry('mod1')])
    useContentStore().manifestByModule['mod1'] = makeManifestEntry('mod1')
    const cacheStore = useCacheStore()

    const wrapper = mountControl()
    await wrapper.find('[role="menuitemcheckbox"]').trigger('click')
    await vi.waitFor(() => {
      expect(cacheStore.isCached('sys1')).toBe(true)
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('System is now available offline.')
  })

  it('unpins the system when toggled off', async () => {
    useCacheStore().cachedSystems = [meta()]
    const cacheStore = useCacheStore()

    const wrapper = mountControl()
    await wrapper.find('[role="menuitemcheckbox"]').trigger('click')
    await vi.waitFor(() => {
      expect(cacheStore.isCached('sys1')).toBe(false)
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('System removed from the offline cache.')
  })

  it('surfaces a pin failure as an error toast and leaves the system uncached', async () => {
    seedApi(makeSystem('sys1'), [makeModule('mod1')], [makeManifestEntry('mod1')])
    useContentStore().manifestByModule['mod1'] = makeManifestEntry('mod1')
    mockRequest.mockImplementation(() => Promise.resolve(null))

    const wrapper = mountControl()
    await wrapper.find('[role="menuitemcheckbox"]').trigger('click')

    await vi.waitFor(() => {
      expect(mockToastError).toHaveBeenCalled()
    })
    expect(mockToastSuccess).not.toHaveBeenCalled()
    expect(useCacheStore().isCached('sys1')).toBe(false)
    expect(wrapper.find('[role="menuitemcheckbox"]').attributes('aria-checked')).toBe('false')
  })

  it('does not report success when the metadata request fails', async () => {
    useContentStore().manifestByModule['mod1'] = makeManifestEntry('mod1')
    mockGet.mockResolvedValue({ ok: false, errors: {} })

    const wrapper = mountControl()
    await wrapper.find('[role="menuitemcheckbox"]').trigger('click')

    await vi.waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Could not load this system. Please try again.')
    })
    expect(mockToastSuccess).not.toHaveBeenCalled()
    expect(useCacheStore().isCached('sys1')).toBe(false)
  })

  it('surfaces an unpin failure as an error toast', async () => {
    useCacheStore().cachedSystems = [meta()]
    vi.spyOn(useCacheStore(), 'unpinSystem').mockRejectedValue(new Error('boom'))

    const wrapper = mountControl()
    await wrapper.find('[role="menuitemcheckbox"]').trigger('click')

    await vi.waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('boom')
    })
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })

  it('shows "Update available" when online and the cached version differs from the manifest', () => {
    useCacheStore().cachedSystems = [meta({ versionString: '1.0' })]
    useContentStore().manifestByModule['mod1'] = makeManifestEntry('mod1', '2.0')

    const wrapper = mountControl()

    expect(wrapper.text()).toContain('Update available')
  })

  it('hides "Update available" when versions match', () => {
    useCacheStore().cachedSystems = [meta({ versionString: '1.0' })]
    useContentStore().manifestByModule['mod1'] = makeManifestEntry('mod1', '1.0')

    const wrapper = mountControl()

    expect(wrapper.text()).not.toContain('Update available')
  })

  it('hides "Update available" when offline', () => {
    useOnline().online.value = false
    useCacheStore().cachedSystems = [meta({ versionString: '1.0' })]
    useContentStore().manifestByModule['mod1'] = makeManifestEntry('mod1', '2.0')

    const wrapper = mountControl()

    expect(wrapper.text()).not.toContain('Update available')
  })
})
