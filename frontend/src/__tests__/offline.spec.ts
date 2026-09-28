import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mock useApi so the auth store never makes real HTTP calls ────────────────
const mockGet = vi.fn()
const mockLoading = ref(false)

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    post: vi.fn(),
    patch: vi.fn(),
    loading: mockLoading,
  })),
}))

// ─── Mock the cache store so bootstrap does not touch IndexedDB ───────────────
const { mockLoadRegistry } = vi.hoisted(() => ({ mockLoadRegistry: vi.fn() }))

vi.mock('@/stores/cacheStore', () => ({
  useCacheStore: vi.fn(() => ({
    loadRegistry: mockLoadRegistry,
  })),
}))

import { useAuthStore } from '@/stores/auth'
import { useOnline } from '@/composables/useOnline'

describe('offline boot', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockLoadRegistry.mockReset()
    mockLoadRegistry.mockResolvedValue(undefined)
    useOnline().online.value = true
  })

  it('enters offline mode (no user, no login) on a network failure', async () => {
    mockGet.mockRejectedValue({ type: 'network' })

    const auth = useAuthStore()
    await auth.bootstrap()

    expect(useOnline().online.value).toBe(false)
    expect(auth.user).toBeNull()
    expect(auth.initialized).toBe(true)
  })

  it('stays online and logged out on an auth failure', async () => {
    mockGet.mockRejectedValue({ type: 'auth' })

    const auth = useAuthStore()
    await auth.bootstrap()

    expect(useOnline().online.value).toBe(true)
    expect(auth.user).toBeNull()
    expect(auth.initialized).toBe(true)
  })

  it('marks the session initialized even when the registry load fails', async () => {
    mockGet.mockRejectedValue({ type: 'network' })
    mockLoadRegistry.mockRejectedValue(new Error('IndexedDB unavailable'))

    const auth = useAuthStore()
    await auth.bootstrap()

    expect(auth.initialized).toBe(true)
    expect(useOnline().online.value).toBe(false)
  })
})
