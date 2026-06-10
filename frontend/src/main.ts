import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { globalErrorHandler } from './lib/globalErrorHandler'

import '@/styles.css'
import { useAuthStore } from './stores/auth'
import { useAppSettingsStore } from './stores/appSettings'
import { useSystemStore } from './stores/system'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.config.errorHandler = globalErrorHandler

useAppSettingsStore().init()

app.mount('#app')

const authStore = useAuthStore()

async function bootstrap(): Promise<void> {
  await authStore.fetchCsrfCookie()
  await authStore.fetchUser().catch(() => { })

  if (authStore.user) {
    await useSystemStore().init()
  }

  authStore.initialized = true
}

bootstrap()
