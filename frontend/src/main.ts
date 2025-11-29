import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import '@/styles.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

app.config.errorHandler = (err, instance, info) => {
  if (import.meta.env.VITE_APP_DEBUG === 'true') {
    console.error('Global error handler:', err, instance, info)
  }
}
