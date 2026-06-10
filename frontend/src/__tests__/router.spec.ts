import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mock useApi so the auth store never makes real HTTP calls ────────────────
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPatch = vi.fn()
const mockLoading = ref(false)

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    loading: mockLoading,
  })),
}))

// Import the real router singleton (with its registered beforeEach guard) and
// the real auth store — both are resolved after the mock above is hoisted.
import router from '@/router/index.ts'
import { useAuthStore } from '@/stores/auth'

const mockUser = {
  id: '01abc',
  name: 'Test User',
  email: 'test@test.com',
  super_admin: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('Router navigation guards', () => {
  beforeEach(async () => {
    // Fresh Pinia per test so store state never leaks between tests.
    setActivePinia(createPinia())
    // Reset to /register (a guest route that is never the target of any test
    // below) so that pushes to /login are never treated as NavigationDuplicated
    // — Vue Router skips guards entirely for duplicate navigations.
    await router.push('/register')
  })

  // ── Unauthenticated user ─────────────────────────────────────────────────────

  describe('unauthenticated user', () => {
    it('navigating to / (protected) redirects to /login with ?redirect=/', async () => {
      const authStore = useAuthStore()
      authStore.user = null

      await router.push('/')

      expect(router.currentRoute.value.path).toBe('/login')
      expect(router.currentRoute.value.query.redirect).toBe('/')
    })

    it('navigating to /systems/abc (protected) redirects to /login with ?redirect=/systems/abc', async () => {
      const authStore = useAuthStore()
      authStore.user = null

      await router.push('/systems/abc')

      expect(router.currentRoute.value.path).toBe('/login')
      expect(router.currentRoute.value.query.redirect).toBe('/systems/abc')
    })

    it('navigating to /login stays on /login — no redirect loop', async () => {
      const authStore = useAuthStore()
      authStore.user = null

      await router.push('/login')

      expect(router.currentRoute.value.name).toBe('login')
    })
  })

  // ── Authenticated user ───────────────────────────────────────────────────────

  describe('authenticated user', () => {
    it('navigating to /login redirects to / (home)', async () => {
      const authStore = useAuthStore()
      authStore.user = mockUser

      await router.push('/login')

      expect(router.currentRoute.value.name).toBe('home')
      expect(router.currentRoute.value.path).toBe('/')
    })

    it('navigating to / (protected) stays on /', async () => {
      const authStore = useAuthStore()
      authStore.user = mockUser

      await router.push('/')

      expect(router.currentRoute.value.name).toBe('home')
      expect(router.currentRoute.value.path).toBe('/')
    })

    it('navigating to /profile (protected) stays on /profile', async () => {
      const authStore = useAuthStore()
      authStore.user = mockUser

      await router.push('/profile')

      expect(router.currentRoute.value.name).toBe('profile')
      expect(router.currentRoute.value.path).toBe('/profile')
    })
  })
})
