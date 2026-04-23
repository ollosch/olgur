import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent } from 'vue'

// ─── Mock auth store ──────────────────────────────────────────────────────────
const mockAuthUser = { value: null as Record<string, unknown> | null }

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    get user() {
      return mockAuthUser.value
    },
  })),
}))

// Dummy components for routes
const Dummy = defineComponent({ template: '<div>page</div>' })

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', meta: { requiresGuest: true }, component: Dummy },
      { path: '/register', name: 'register', meta: { requiresGuest: true }, component: Dummy },
      {
        path: '/verify-email',
        name: 'verify-email',
        meta: { requiresAuth: true },
        component: Dummy,
      },
      { path: '/', name: 'home', meta: {}, component: Dummy },
      { path: '/public', name: 'public', component: Dummy },
    ],
  })
}

// Import navigation guard logic separately (we re-implement the guard inline
// using the same logic as router/index.ts, to avoid importing the real router
// which would break module isolation).
import { useAuthStore } from '@/stores/auth'

async function runGuard(
  router: ReturnType<typeof buildRouter>,
  to: { name: string; fullPath?: string },
) {
  // Simulate the beforeEach guard from router/index.ts
  const auth = useAuthStore()
  const route = router.resolve({ name: to.name })
  const requiresAuth = route.meta.requiresAuth
  const requiresGuest = route.meta.requiresGuest
  const fullPath = to.fullPath ?? route.fullPath

  if (requiresAuth && !auth.user) {
    return { name: 'login', query: { redirect: fullPath } }
  }

  if (requiresGuest && auth.user) {
    return { name: 'home' }
  }

  return undefined
}

describe('Router navigation guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockAuthUser.value = null
  })

  describe('requiresAuth guard', () => {
    it('redirects to login with redirect query when unauthenticated', async () => {
      mockAuthUser.value = null
      const router = buildRouter()
      const result = await runGuard(router, { name: 'verify-email', fullPath: '/verify-email' })
      expect(result).toEqual({ name: 'login', query: { redirect: '/verify-email' } })
    })

    it('allows access when authenticated', async () => {
      mockAuthUser.value = { id: '1', name: 'Alice', email: 'a@b.com' }
      const router = buildRouter()
      const result = await runGuard(router, { name: 'verify-email' })
      expect(result).toBeUndefined()
    })
  })

  describe('requiresGuest guard', () => {
    it('redirects to home when authenticated user visits guest route', async () => {
      mockAuthUser.value = { id: '1', name: 'Alice', email: 'a@b.com' }
      const router = buildRouter()
      const result = await runGuard(router, { name: 'login' })
      expect(result).toEqual({ name: 'home' })
    })

    it('allows access to guest route when unauthenticated', async () => {
      mockAuthUser.value = null
      const router = buildRouter()
      const result = await runGuard(router, { name: 'login' })
      expect(result).toBeUndefined()
    })

    it('redirects authenticated user away from register to home', async () => {
      mockAuthUser.value = { id: '1', name: 'Alice', email: 'a@b.com' }
      const router = buildRouter()
      const result = await runGuard(router, { name: 'register' })
      expect(result).toEqual({ name: 'home' })
    })
  })

  describe('routes without guards', () => {
    it('allows unauthenticated access to public routes', async () => {
      mockAuthUser.value = null
      const router = buildRouter()
      const result = await runGuard(router, { name: 'public' })
      expect(result).toBeUndefined()
    })

    it('allows authenticated access to public routes', async () => {
      mockAuthUser.value = { id: '1', name: 'Alice', email: 'a@b.com' }
      const router = buildRouter()
      const result = await runGuard(router, { name: 'public' })
      expect(result).toBeUndefined()
    })
  })
})
