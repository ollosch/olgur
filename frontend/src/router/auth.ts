import LoginView from '@/views/Auth/LoginView.vue'

const authRoutes = [
  {
    path: '/login',
    name: 'login',
    meta: { requiresGuest: true },
    component: LoginView,
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

if (import.meta.env.REGISTRATION_ENABLED === 'true') {
  authRoutes.push({
    path: '/register',
    name: 'register',
    meta: { requiresGuest: true },
    component: () => import('@/views/Auth/RegisterView.vue'),
  })
}

export default authRoutes
