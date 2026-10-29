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

// ─── Stub lazily-loaded views so the guard test never imports them ────────────
vi.mock('@/views/SystemView.vue', () => ({
  default: { name: 'SystemViewStub', template: '<div />' },
}))
vi.mock('@/views/RuleDetailView.vue', () => ({
  default: { name: 'RuleDetailViewStub', template: '<div />' },
}))

import router from '@/router/index.ts'
import { useAuthStore } from '@/stores/auth'
import { useCacheStore } from '@/stores/cacheStore'
import { useOnline } from '@/composables/useOnline'
import type { User } from '@/types/domain'

function meta(systemId: string) {
  return { systemId, name: `System ${systemId}`, versionString: '1.0', cachedAt: 0, size: 0 }
}

function makeUser(): User {
  return {
    id: 'user1',
    name: 'User One',
    email: 'user@example.com',
    super_admin: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

describe('router guard — cached systems offline/logged-out', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    useAuthStore().initialized = true
    useCacheStore().cachedSystems = []
    useOnline().online.value = true
    await router.push('/reset-password-request')
  })

  it('admits a cached system for a logged-out user when offline', async () => {
    const authStore = useAuthStore()
    authStore.user = null
    useOnline().online.value = false
    useCacheStore().cachedSystems = [meta('abc')]

    await router.push('/systems/abc')

    expect(router.currentRoute.value.name).toBe('system')
    expect(router.currentRoute.value.path).toBe('/systems/abc')
  })

  it('redirects a logged-out user to login for a cached system when online', async () => {
    const authStore = useAuthStore()
    authStore.user = null
    useCacheStore().cachedSystems = [meta('abc')]

    await router.push('/systems/abc')

    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/systems/abc')
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

  it('admits the home route for a logged-out user when offline', async () => {
    const authStore = useAuthStore()
    authStore.user = null
    useOnline().online.value = false

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('redirects /login to home when offline', async () => {
    useOnline().online.value = false

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('redirects the reset-password-request screen to home when offline', async () => {
    useOnline().online.value = false
    await router.push('/login')

    await router.push('/reset-password-request')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('redirects verify-email to home when offline even if authenticated', async () => {
    useAuthStore().user = makeUser()
    useOnline().online.value = false

    await router.push('/verify-email')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('redirects profile to home when offline even if authenticated', async () => {
    useAuthStore().user = makeUser()
    useOnline().online.value = false

    await router.push('/profile')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('redirects settings to home when offline even if authenticated', async () => {
    useAuthStore().user = makeUser()
    useOnline().online.value = false

    await router.push('/settings')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('redirects an uncached system to home when offline even if authenticated', async () => {
    useAuthStore().user = makeUser()
    useOnline().online.value = false
    useCacheStore().cachedSystems = []

    await router.push('/systems/xyz')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('admits a cached system rule child when offline', async () => {
    useAuthStore().user = makeUser()
    useOnline().online.value = false
    useCacheStore().cachedSystems = [meta('abc')]

    await router.push('/systems/abc/rule/r1')

    expect(router.currentRoute.value.name).toBe('system-rule')
    expect(router.currentRoute.value.params.systemId).toBe('abc')
  })
})
