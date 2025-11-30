import { ref } from 'vue'
import { defineStore } from 'pinia'

import { useApi } from '@/composables/useApi'
import router from '@/router'

interface User {
  id: string
  name: string
  email: string
  email_verified_at?: string
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  token: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  password_confirmation: string
}

export const useAuthStore = defineStore('auth', () => {
  const { get, post, loading, errors } = useApi()

  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('auth_token'))

  async function login(credentials: LoginRequest) {
    const res = await post<TokenResponse, LoginRequest>('/login', credentials)

    if (!errors.value) {
      storeToken(res.token)
      await fetchUser()
      redirectIfAuthenticated()
    }
  }

  async function register(credentials: RegisterRequest) {
    const res = await post<TokenResponse, RegisterRequest>('/register', credentials)

    if (!errors.value) {
      storeToken(res.token)
      await fetchUser()
      // TODO: toast('Registration successful! Please verify your email.')
      redirectIfAuthenticated()
    }
  }

  async function logout() {
    await post('/logout')
    clear()
    router.push({ name: 'login' })
  }

  async function verifyEmail(url: string) {
    await get(url)
    await fetchUser()
  }

  async function sendResetLink(credentials: { email: string }) {
    await post('/forgot-password', credentials)
  }

  async function resetPassword(
    credentials: { password: string; password_confirmation: string },
    params: { token: string; email: string },
  ) {
    await post('/reset-password', { ...credentials, ...params })
  }

  async function storeToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('auth_token', newToken)
  }

  async function fetchUser() {
    user.value = await get<User>('/me')
  }

  async function redirectIfAuthenticated() {
    if (user.value) {
      router.push({ name: 'dashboard' })
    }
  }

  function clear() {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
  }

  return {
    clear,
    fetchUser,
    login,
    logout,
    register,
    resetPassword,
    sendResetLink,
    verifyEmail,
    errors,
    loading,
    token,
    user,
  }
})
