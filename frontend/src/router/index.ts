import { createRouter, createWebHistory } from 'vue-router'
import authRoutes from '@/router/auth.ts'
import appRoutes from '@/router/app.ts'
import { useAuthStore } from '@/stores/auth.ts'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...authRoutes, ...appRoutes],
})

/**
 * Navigation Guard
 *
 * @remarks
 * This guard checks the user's authentication status before each route change.
 * It ensures that:
 * - Routes requiring authentication are only accessible to authenticated users.
 * - Routes requiring guest access are only accessible to unauthenticated users.
 * - If the user's auth token is present but their session is not validated,
 *   it attempts to validate the session by calling `checkAuth`.
 *
 * If a user tries to access a protected route without being authenticated,
 * they are redirected to the login page with an optional `redirect` query
 * parameter indicating their original destination. Conversely, authenticated
 * users trying to access guest-only routes are redirected to the dashboard.
 */
router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const requiresAuth = to.meta.requiresAuth
  const requiresGuest = to.meta.requiresGuest

  if (!auth.user && auth.token) {
    try {
      await auth.fetchUser()
    } catch {
      // Auth failed - clear invalid token to prevent redirect loop
      auth.clear()
    }
  }

  if (requiresAuth && !auth.user) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (requiresGuest && auth.user) {
    return { name: 'dashboard' }
  }
})

export default router
