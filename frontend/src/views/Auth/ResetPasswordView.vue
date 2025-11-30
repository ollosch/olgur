<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useAuthStore } from '@/stores/auth'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import AuthLayout from './AuthLayout.vue'
import { useRoute } from 'vue-router'
import router from '@/router'
import { ref, onMounted } from 'vue'

const status = ref<'success' | 'error'>('success')

const route = useRoute()
const auth = useAuthStore()
const { defineField, handleSubmit, errors, setErrors } = useForm<{
  password: string
  password_confirmation: string
}>()

const [password, passwordAttrs] = defineField('password')
const [passwordConfirmation, passwordConfirmationAttrs] = defineField('password_confirmation')

const email = route.query.email
const token = route.query.token
const message = ref('Enter your new password below to reset your password.')

onMounted(async () => {
  if (!email || !token) {
    status.value = 'error'
    message.value = 'Invalid password reset link. Redirecting to login...'

    setTimeout(() => {
      router.push({ name: 'login' })
    }, 3000)
  }
})

const onSubmit = handleSubmit(async (values) => {
  const token = route.query.token as string
  const email = route.query.email as string

  await auth.resetPassword(values, { token, email })

  if (auth.errors) {
    setErrors(auth.errors)
    return
  }

  // TODO: toast('Password reset successfully. You can now log in.')
  goToLogin()
})

const goToLogin = () => {
  router.push({ name: 'login' })
}
</script>

<template>
  <AuthLayout>
    {{ errors }}
    {{ auth.errors }}
    <Card>
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription v-if="status === 'success'">
          {{ message }}
        </CardDescription>
        <CardDescription v-else>
          {{ message }}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <FieldGroup v-if="status === 'success'">
          <form @submit.prevent="onSubmit">
            <Field>
              <FieldLabel for="password"> Password </FieldLabel>
              <Input
                v-model="password"
                v-bind="passwordAttrs"
                id="password"
                type="password"
                required
              />
              <div v-if="auth.errors?.email">{{ auth.errors.email }}</div>
              <div v-if="errors.password">{{ errors.password }}</div>
              <FieldDescription>Must be at least 8 characters long.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel for="confirm-password"> Confirm Password </FieldLabel>
              <Input
                v-model="passwordConfirmation"
                v-bind="passwordConfirmationAttrs"
                id="confirm-password"
                type="password"
                required
              />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <Field class="mt-4">
              <Button :disabled="auth.loading" type="submit"> Reset Password </Button>
              <FieldDescription class="px-6 text-center">
                Back to
                <router-link :to="{ name: 'login' }">Sign in</router-link>
              </FieldDescription>
            </Field>
          </form>
        </FieldGroup>
        <div v-else class="flex flex-col items-center gap-4 py-4">
          <svg class="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <Button @click="goToLogin">Go to Login</Button>
        </div>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
