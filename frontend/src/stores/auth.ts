import { ref } from 'vue'
import { defineStore } from 'pinia'

import { useApi } from '@/composables/useApi'
import type { ApiResult } from '@/lib/http'
import type {
  User,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ApiResource,
} from '@/types/domain'

export const useAuthStore = defineStore('auth', () => {
  const { get, post, patch, loading } = useApi()

  const user = ref<User | null>(null)
  const initialized = ref(false)

  async function login(credentials: LoginRequest): Promise<ApiResult<void>> {
    const result = await post<void, LoginRequest>('/login', credentials)
    if (result.ok) await fetchUser()
    return result
  }

  async function register(credentials: RegisterRequest): Promise<ApiResult<void>> {
    const result = await post<void, RegisterRequest>('/register', credentials)
    if (result.ok) await fetchUser()
    return result
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

  async function sendResetLink(credentials: { email: string }): Promise<ApiResult<void>> {
    return await post('/forgot-password', credentials)
  }

  async function resetPassword(
    credentials: { password: string; password_confirmation: string },
    params: { token: string; email: string },
  ): Promise<ApiResult<void>> {
    return await post('/reset-password', { ...credentials, ...params })
  }

  async function fetchCsrfCookie() {
    await get(import.meta.env.VITE_COOKIE_URL)
  }

  async function fetchUser() {
    const result = await get<ApiResource<User>>('/me')
    if (result.ok) {
      user.value = result.data.data
    } else {
      clear()
    }
  }

  async function updateProfile(data: UpdateProfileRequest): Promise<ApiResult<User>> {
    const result = await patch<User, UpdateProfileRequest>('/me', data)
    if (result.ok) user.value = result.data
    return result
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
    initialized,
    loading,
    user,
  }
})
