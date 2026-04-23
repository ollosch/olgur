import { createRouter, createWebHistory } from 'vue-router'
import authRoutes from '@/router/auth.ts'
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

export default router
