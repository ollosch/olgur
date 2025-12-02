<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import AuthLayout from './AuthLayout.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const status = ref<'verifying' | 'success' | 'error'>('verifying')
const message = ref('')

onMounted(async () => {
  const url = route.query.url as string

  if (!url) {
    status.value = 'error'
    message.value = 'Invalid verification link. Please check your email and try again.'
    return
  }

  try {
    await authStore.verifyEmail(url)
    status.value = 'success'
    message.value = 'Your email has been verified successfully!'

    setTimeout(() => {
      router.push({ name: 'systems' })
    }, 2000)
  } catch {
    status.value = 'error'
    message.value = 'Failed to verify email. The link may have expired or is invalid.'
  }
})

const goToLogin = () => {
  router.push({ name: 'login' })
}
</script>

<template>
  <AuthLayout>
    <Card>
      <CardHeader>
        <CardTitle>Email Verification</CardTitle>
        <CardDescription v-if="status === 'verifying'">
          Verifying your email address...
        </CardDescription>
        <CardDescription v-else-if="status === 'success'">
          {{ message }}
        </CardDescription>
        <CardDescription v-else>
          {{ message }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="status === 'verifying'" class="flex justify-center py-4">
          <div
            class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"
          />
        </div>
        <div v-else-if="status === 'success'" class="flex flex-col items-center gap-4 py-4">
          <svg
            class="w-16 h-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <p class="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
        <div v-else class="flex flex-col items-center gap-4 py-4">
          <svg class="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Back to <Button @click="goToLogin">Log In</Button>
        </div>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
