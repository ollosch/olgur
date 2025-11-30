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
  {
    path: '/verify-email',
    name: 'verify-email',
    meta: { requiresAuth: true },
    component: () => import('@/views/Auth/VerifyEmailView.vue'),
  },
  {
    path: '/reset-password-request',
    name: 'reset-password-request',
    meta: { requiresGuest: true },
    component: () => import('@/views/Auth/ResetPasswordRequestView.vue'),
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    meta: { requiresGuest: true },
    component: () => import('@/views/Auth/ResetPasswordView.vue'),
  },
]
