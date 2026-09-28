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
vi.mock('@/components/ui/switch', () => ({
  Switch: defineComponent({
    name: 'SwitchStub',
    props: {
      modelValue: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
    },
    emits: ['update:modelValue'],
    template:
      '<button type="button" role="switch" :aria-checked="String(modelValue)" :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)" />',
  }),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: defineComponent({ name: 'BadgeStub', template: '<span><slot /></span>' }),
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
    markdown: null,
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

  it('shows the switch unchecked and no badge when the system is not cached', () => {
    const wrapper = mountControl()

    expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.text()).not.toContain('Cached')
  })

  it('shows the cached badge and footprint when the system is cached', () => {
    useCacheStore().cachedSystems = [meta({ size: 1536 })]

    const wrapper = mountControl()

    expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.text()).toContain('Cached')
    expect(wrapper.text()).toContain('1.5 KB')
  })

  it('pins the system when the switch is toggled on', async () => {
    seedApi(makeSystem('sys1'), [makeModule('mod1')], [makeManifestEntry('mod1')])
    const cacheStore = useCacheStore()

    const wrapper = mountControl()
    await wrapper.find('[role="switch"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Cached')
    })

    expect(cacheStore.isCached('sys1')).toBe(true)
  })

  it('unpins the system when the switch is toggled off', async () => {
    useCacheStore().cachedSystems = [meta()]
    const cacheStore = useCacheStore()

    const wrapper = mountControl()
    await wrapper.find('[role="switch"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.text()).not.toContain('Cached')
    })

    expect(cacheStore.isCached('sys1')).toBe(false)
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
