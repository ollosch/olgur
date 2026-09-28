import type { ApiError } from './http'
import type { ComponentPublicInstance } from 'vue'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useOnline } from '@/composables/useOnline'
import { toast } from 'vue-sonner'
import { redirectAlreadyAuthenticated, redirectOnSessionExpiry } from '@/lib/sessionNavigation'

export async function globalErrorHandler(
  err: unknown,
  instance: ComponentPublicInstance | null,
  info?: string,
) {
  const error = err as ApiError

  // Only log debug information when explicitly enabled and not running tests
  const isDebug = import.meta.env.VITE_APP_DEBUG === 'true'
  const isTest = Boolean(import.meta.env.VITEST)

  if (isDebug && !isTest) {
    console.error('Global error handler:', err, instance, info)

    if (!error) {
      console.error('Error is empty:', err, instance, info)
    }
  }

  const authStore = useAuthStore()

  switch (error.type) {
    case 'auth': {
      if (error.message === 'Already authenticated.') {
        redirectAlreadyAuthenticated(router)
        return
      }

      const wasAuthenticated = authStore.user !== null
      authStore.clear()

      if (wasAuthenticated) {
        toast.error('Your session has expired. Please log in again.')
      }

      redirectOnSessionExpiry(router)
      break
    }

    case 'conflict':
      toast.error(error.message || 'Conflict error. Please try again.')
      break

    case 'forbidden':
      toast.error('You do not have permission to access this resource.')
      break

    case 'network':
      useOnline().online.value = false
      toast.error('Network error. Please check your internet connection.')
      break

    case 'validation': {
      const firstMessage = Object.values(error.errors)[0]
      if (firstMessage) {
        toast.error(firstMessage)
      }
      break
    }
  }
}
