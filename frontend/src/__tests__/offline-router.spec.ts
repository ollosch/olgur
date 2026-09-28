import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mock useApi so the auth/cache stores never make real HTTP calls ──────────
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

// ─── Stub the lazily-loaded system view so the guard test never imports it ────
vi.mock('@/views/SystemView.vue', () => ({
  default: { name: 'SystemViewStub', template: '<div />' },
}))

import router from '@/router/index.ts'
import { useAuthStore } from '@/stores/auth'
import { useCacheStore } from '@/stores/cacheStore'

function meta(systemId: string) {
  return { systemId, name: `System ${systemId}`, versionString: '1.0', cachedAt: 0, size: 0 }
}

describe('router guard — cached systems offline/logged-out', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    useAuthStore().initialized = true
    useCacheStore().cachedSystems = []
    await router.push('/reset-password-request')
  })

  it('admits a cached system for a logged-out user', async () => {
    const authStore = useAuthStore()
    authStore.user = null
    useCacheStore().cachedSystems = [meta('abc')]

    await router.push('/systems/abc')

    expect(router.currentRoute.value.name).toBe('system')
    expect(router.currentRoute.value.path).toBe('/systems/abc')
  })

  it('redirects a logged-out user to login for an uncached system', async () => {
    const authStore = useAuthStore()
    authStore.user = null

    await router.push('/systems/xyz')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/systems/xyz')
  })

  it('still redirects a logged-out user to login for a cached system when online-auth is required elsewhere', async () => {
    const authStore = useAuthStore()
    authStore.user = null
    useCacheStore().cachedSystems = [meta('abc')]

    await router.push('/')

    expect(router.currentRoute.value.path).toBe('/login')
  })
})
