import LoginView from '@/views/Auth/LoginView.vue'

export default [
  {
    path: '/login',
    name: 'login',
    meta: { requiresGuest: true },
    component: LoginView,
  },
  {
    path: '/register',
    name: 'register',
    meta: { requiresGuest: true },
    component: () => import('@/views/Auth/RegisterView.vue'),
  },
]
