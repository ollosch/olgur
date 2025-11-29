import { ref, computed } from 'vue'
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
  const isAuthenticated = computed(() => !!token.value && !!user.value)

  async function login(credentials: LoginRequest) {
    const res = await post<TokenResponse, LoginRequest>('/login', credentials)

    if (!errors.value) {
      token.value = res.token
      localStorage.setItem('auth_token', res.token)

      await fetchUser()
    }

    if (isAuthenticated.value) {
      router.push({ name: 'dashboard' })
    }
  }

  async function register(credentials: RegisterRequest) {
    await post<null, RegisterRequest>('/register', credentials)

    if (!errors.value) {
      await login({
        email: credentials.email,
        password: credentials.password,
      })
    }
  }

  async function logout() {
    await post('/logout')
    clear()
    router.push({ name: 'login' })
  }

  async function check() {
    if (!token.value) {
      return false
    }

    try {
      await fetchUser()
    } catch {
      clear()
    }
  }

  async function fetchUser() {
    user.value = await get<User>('/me')
  }

  function clear() {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
  }

  return {
    login,
    register,
    logout,
    check,
    clear,
    user,
    token,
    isAuthenticated,
    loading,
    errors,
  }
})
