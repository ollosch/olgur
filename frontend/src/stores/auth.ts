import { ref } from 'vue'
import { defineStore } from 'pinia'

import { useApi } from '@/composables/useApi'
import type { User, LoginRequest, RegisterRequest, UpdateProfileRequest, ApiResource } from '@/types/domain'

export const useAuthStore = defineStore('auth', () => {
  const { get, post, patch, loading, errors } = useApi()

  const user = ref<User | null>(null)

  async function login(credentials: LoginRequest) {
    await post<void, LoginRequest>('/login', credentials)

    if (!errors.value) {
      await fetchUser()
    }
  }

  async function register(credentials: RegisterRequest) {
    await post<void, RegisterRequest>('/register', credentials)

    if (!errors.value) {
      await fetchUser()
    }
  }

  async function logout() {
    try {
      await post('/logout')
    } finally {
      clear()
    }
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

  async function fetchCsrfCookie() {
    await get(import.meta.env.VITE_COOKIE_URL)
  }

  async function fetchUser() {
    const result = await get<ApiResource<User>>('/me')

    if (result) {
      user.value = result.data
    } else {
      clear()
    }
  }

  async function updateProfile(data: UpdateProfileRequest) {
    const updated = await patch<User, UpdateProfileRequest>('/me', data)
    if (updated) {
      user.value = updated
    }
  }

  function clear() {
    user.value = null
  }

  return {
    clear,
    fetchCsrfCookie,
    fetchUser,
    login,
    logout,
    register,
    resetPassword,
    sendResetLink,
    updateProfile,
    verifyEmail,
    errors,
    loading,
    user,
  }
})
