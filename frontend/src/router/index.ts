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
      component: HomeView,
    }
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  const requiresAuth = to.meta.requiresAuth
  const requiresGuest = to.meta.requiresGuest

  if (requiresAuth && !auth.user) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (requiresGuest && auth.user) {
    return { name: 'home' }
  }
})

export default router
