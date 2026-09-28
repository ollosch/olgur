import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import authRoutes from '@/router/auth.ts'
import { useAuthStore } from '@/stores/auth.ts'
import { useCacheStore } from '@/stores/cacheStore'
import { useOnline } from '@/composables/useOnline'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    ...authRoutes,
    {
      name: 'home',
      path: '/',
      meta: { requiresAuth: true },
      component: HomeView,
    },
    {
      name: 'profile',
      path: '/profile',
      meta: { requiresAuth: true },
      component: () => import('@/views/UserProfileView.vue'),
    },
    {
      name: 'settings',
      path: '/settings',
      meta: { requiresAuth: true },
      component: () => import('@/views/AppSettingsView.vue'),
    },
    {
      name: 'system',
      path: '/systems/:systemId',
      meta: { requiresAuth: true, requiresSystemAccess: true },
      component: () => import('@/views/SystemView.vue'),
      children: [
        // Rule detail view
        {
          path: 'rule/:ruleId',
          name: 'system-rule',
          component: () => import('@/views/RuleDetailView.vue'),
        },
        // Game data (tables, SOPs, ordnance, vehicles) — deep link from search
        {
          path: 'game-data/:gameDatumId',
          name: 'system-game-datum',
          component: () => import('@/views/GameDataView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'home' },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // Block the guard until bootstrap has resolved so we never redirect based on
  // a still-null user that is about to be populated by fetchUser().
  if (!authStore.initialized) {
    await new Promise<void>((resolve) => {
      const stop = watch(
        () => authStore.initialized,
        (initialized) => {
          if (initialized) {
            stop()
            resolve()
          }
        },
        { immediate: true },
      )
    })
  }

  const requiresAuth = to.meta.requiresAuth
  const requiresGuest = to.meta.requiresGuest

  if (requiresAuth && !authStore.user) {
    const requiresSystemAccess = to.meta.requiresSystemAccess === true
    const systemId = to.params['systemId'] as string | undefined
    if (
      requiresSystemAccess &&
      systemId &&
      useOnline().offline.value &&
      useCacheStore().isCached(systemId)
    ) {
      return true
    }
    if (useOnline().offline.value && to.name === 'home') {
      return true
    }
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (requiresGuest && authStore.user) {
    return { name: 'home' }
  }
})

export default router
