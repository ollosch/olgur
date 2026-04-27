import { createRouter, createWebHistory } from 'vue-router'
import authRoutes from '@/router/auth.ts'
import { useAuthStore } from '@/stores/auth.ts'
import HomeView from '@/views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...authRoutes,
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
      meta: { requiresAuth: true },
      component: () => import('@/views/SystemView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'home' },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const requiresAuth = to.meta.requiresAuth
  const requiresGuest = to.meta.requiresGuest

  if (requiresAuth && !authStore.user) {
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
