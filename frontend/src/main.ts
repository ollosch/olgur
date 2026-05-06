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
app.config.errorHandler = globalErrorHandler

const authStore = useAuthStore()

const appSettings = useAppSettingsStore()
appSettings.init()

if (authStore.user) {
  const systemStore = useSystemStore()
  await systemStore.init()
}

app.use(router)
app.mount('#app')
