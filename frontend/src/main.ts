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

const authStore = useAuthStore()
await authStore.fetchCsrfCookie()
await authStore.fetchUser().catch(() => {})

useAppSettingsStore().init()

if (authStore.user) {
  await useSystemStore().init()
}

app.mount('#app')
