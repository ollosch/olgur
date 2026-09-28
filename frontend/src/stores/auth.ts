import { ref } from 'vue'
import { defineStore } from 'pinia'

import { useApi } from '@/composables/useApi'
import { useOnline } from '@/composables/useOnline'
import { useCacheStore } from '@/stores/cacheStore'
import { useSystemStore } from '@/stores/system'
import type { ApiResult, ApiError } from '@/lib/http'
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

  /**
   * Resolve the session on startup. A network failure flips the app into
   * offline mode (user stays null, no login redirect); an auth failure simply
   * leaves the user logged out. The cached-system registry is loaded so the
   * router guard can admit pinned systems while offline.
   */
  async function bootstrap(): Promise<void> {
    try {
      let offline = false

      try {
        await fetchCsrfCookie()
      } catch (e) {
        if ((e as ApiError).type === 'network') offline = true
      }

      if (!offline) {
        try {
          await fetchUser()
        } catch (e) {
          if ((e as ApiError).type === 'network') offline = true
        }
      }

      if (offline) useOnline().online.value = false

      await useCacheStore()
        .loadRegistry()
        .catch(() => {})

      if (user.value && !offline) {
        await useSystemStore().init()
      }
    } finally {
      initialized.value = true
    }
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
    bootstrap,
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
    registrationEnabled: import.meta.env.REGISTRATION_ENABLED === 'true',
    user,
  }
})
