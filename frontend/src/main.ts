import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import type { ApiError } from './lib/http'
import { toast } from 'vue-sonner'

import '@/styles.css'
import { useAuthStore } from './stores/auth'
import { useAppSettingsStore } from './stores/appSettings'

const app = createApp(App)

app.use(createPinia())

const authStore = useAuthStore()

const appSettings = useAppSettingsStore()
appSettings.init()

await authStore.fetchCsrfCookie()
await authStore.fetchUser().catch(() => {})

app.use(router)
app.mount('#app')

app.config.errorHandler = async (err, instance, info) => {
  const error = err as ApiError

  if (import.meta.env.VITE_APP_DEBUG === 'true') {
    console.error('Global error handler:', err, instance, info)
  }

  if (!error) {
    console.error('Error is empty:', err, instance, info)
  }

  switch (error.type) {
    case 'auth': {
      if (error.message === 'Already authenticated.') {
        router.push({ name: 'home' })
        return
      }

      const wasAuthenticated = authStore.user !== null
      authStore.clear()

      if (wasAuthenticated) {
        toast.error('Your session has expired. Please log in again.')
      }

      router.push({ name: 'login' })
      break
    }

    case 'conflict':
      toast.error(error.message || 'Conflict error. Please try again.')
      break

    case 'forbidden':
      toast.error('You do not have permission to access this resource.')
      break

    case 'network':
      toast.error('Network error. Please check your internet connection.')
      break

    case 'validation':
      // This is a safety net in case useApi is not used properly in some component.
      // Ideally, all API calls should be made through useApi which handles validation errors locally.
      // Shows the first error message as a toast.
      const firstMessage = Object.values(error.errors)[0]
      if (firstMessage) {
        toast.error(firstMessage)
      }
      break
  }
}
