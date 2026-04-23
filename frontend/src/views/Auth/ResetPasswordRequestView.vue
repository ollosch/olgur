<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useAuthStore } from '@/stores/auth'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import AuthLayout from './AuthLayout.vue'

const auth = useAuthStore()
const { defineField, handleSubmit, errors, setErrors } = useForm<{ email: string }>()

const [email, emailAttrs] = defineField('email')

const onSubmit = handleSubmit(async (values) => {
  await auth.sendResetLink(values)

  if (auth.errors) {
    setErrors(auth.errors)
  }
})
</script>

<template>
  <AuthLayout>
    <Card>
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Enter your email below to receive a password reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="onSubmit">
          <FieldGroup>
            <Field>
              <FieldLabel for="email"> Email </FieldLabel>
              <Input
                v-model="email"
                v-bind="emailAttrs"
                id="email"
                type="email"
                placeholder="m@example.com"
                required
              />
              <div v-if="errors.email">{{ errors.email }}</div>
            </Field>
            <Field>
              <Button :disabled="auth.loading" type="submit"> Send Reset Link </Button>
              <FieldDescription class="text-center">
                Back to <router-link :to="{ name: 'login' }"> Log in </router-link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
