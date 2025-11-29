<script setup lang="ts">
import router from '@/router'
import { useForm } from 'vee-validate'
import { useAuthStore, type LoginRequest } from '@/stores/auth'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import AuthLayout from './AuthLayout.vue'

const auth = useAuthStore()
const { defineField, handleSubmit, errors, setErrors } = useForm<LoginRequest>()

const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')

const onSubmit = handleSubmit(async (values) => {
  await auth.login(values)

  if (auth.errors) {
    setErrors(auth.errors)
  }
})
</script>

<template>
  <AuthLayout>
    <Card>
      <CardHeader>
        <CardTitle>Login to Olwu</CardTitle>
        <CardDescription>
          Enter your email and password below to login to your account
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
              <div class="flex items-center">
                <FieldLabel for="password"> Password </FieldLabel>
                <a href="#" class="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                  Forgot your password?
                </a>
              </div>
              <Input
                v-model="password"
                v-bind="passwordAttrs"
                id="password"
                type="password"
                required
              />
            </Field>
            <div v-if="errors.password">{{ errors.password }}</div>
            <Field>
              <Button :disabled="auth.loading" type="submit"> Login </Button>
              <FieldDescription class="text-center">
                Don't have an account?
                <router-link :to="{ name: 'register' }"> Sign up </router-link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
