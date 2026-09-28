import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import { toast } from 'vue-sonner'

import App from './App.vue'
import router from './router'
import { globalErrorHandler, setupUnhandledRejectionHandler } from './lib/globalErrorHandler'

import '@/styles.css'
import { useAuthStore } from './stores/auth'
import { useAppSettingsStore } from './stores/appSettings'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.config.errorHandler = globalErrorHandler
setupUnhandledRejectionHandler()

useAppSettingsStore().init()

app.mount('#app')

const authStore = useAuthStore()

authStore.bootstrap().catch((err: unknown) => globalErrorHandler(err, null))

registerSW({
  immediate: true,
  onNeedRefresh() {
    toast('New version available — reload to update.', {
      action: { label: 'Reload', onClick: () => window.location.reload() },
    })
  },
  onOfflineReady() {
    toast('Ready to work offline.')
  },
})
