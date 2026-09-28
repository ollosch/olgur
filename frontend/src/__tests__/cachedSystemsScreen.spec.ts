import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
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

// ─── Stub the reka-ui-backed button ────────────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  Button: defineComponent({
    name: 'ButtonStub',
    template: '<button v-bind="$attrs"><slot /></button>',
  }),
}))

import CachedSystemsScreen from '@/components/systems/CachedSystemsScreen.vue'
import { useCacheStore } from '@/stores/cacheStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function meta(systemId: string, size: number, versionString = '1.0') {
  return { systemId, name: `System ${systemId}`, versionString, cachedAt: 0, size }
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

async function resetIndexedDb(): Promise<void> {
  await closeIdb()
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('olgur-offline')
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

function mockStorageEstimate(usage: number, quota: number) {
  Object.defineProperty(navigator, 'storage', {
    value: { estimate: vi.fn().mockResolvedValue({ usage, quota }) },
    configurable: true,
  })
}

// ─────────────────────────────────────────────────────────────────────────────

describe('CachedSystemsScreen', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockStorageEstimate(0, 0)
    await resetIndexedDb()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await resetIndexedDb()
  })

  it('renders an empty state when nothing is cached', async () => {
    const wrapper = mount(CachedSystemsScreen, {
      global: { plugins: [buildRouter()] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('No systems cached for offline use.')
  })

  it('lists cached systems with names, versions, sizes and unpin buttons', async () => {
    useCacheStore().cachedSystems = [meta('sys1', 512), meta('sys2', 2048)]

    const wrapper = mount(CachedSystemsScreen, {
      global: { plugins: [buildRouter()] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('System sys1')
    expect(wrapper.text()).toContain('System sys2')
    expect(wrapper.text()).toContain('512 B')
    expect(wrapper.text()).toContain('2 KB')
    const unpins = wrapper.findAll('button').filter((b) => b.text() === 'Unpin')
    expect(unpins).toHaveLength(2)
  })

  it('shows the storage used vs quota and a progress bar when quota is known', async () => {
    mockStorageEstimate(1536, 3072)

    const wrapper = mount(CachedSystemsScreen, {
      global: { plugins: [buildRouter()] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('1.5 KB')
    expect(wrapper.text()).toContain('3 KB')
    expect(wrapper.text()).toContain('used')
    expect(wrapper.find('.h-1\\.5').exists()).toBe(true)
  })

  it('unpins a system and frees its footprint when Unpin is clicked', async () => {
    const cacheStore = useCacheStore()
    cacheStore.cachedSystems = [meta('sys1', 512), meta('sys2', 1024)]

    const wrapper = mount(CachedSystemsScreen, {
      global: { plugins: [buildRouter()] },
    })
    await flushPromises()

    const unpin = wrapper.findAll('button').find((b) => b.text() === 'Unpin')!
    await unpin.trigger('click')
    await vi.waitFor(() => {
      expect(cacheStore.cachedSystems).toHaveLength(1)
    })

    expect(cacheStore.isCached('sys1')).toBe(false)
    expect(wrapper.text()).not.toContain('System sys1')
  })
})
