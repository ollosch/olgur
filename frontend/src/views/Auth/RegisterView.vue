<script setup lang="ts">
import { useForm } from 'vee-validate'
import { useAuthStore, type RegisterRequest } from '@/stores/auth'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import AuthLayout from './AuthLayout.vue'

const auth = useAuthStore()
const { defineField, handleSubmit, errors, setErrors } = useForm<RegisterRequest>()

const [name, nameAttrs] = defineField('name')
const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')
const [passwordConfirmation, passwordConfirmationAttrs] = defineField('password_confirmation')

const onSubmit = handleSubmit(async (values) => {
  await auth.register(values)

  if (auth.errors) {
    setErrors(auth.errors)
  }
})
</script>

<template>
  <AuthLayout>
    <Card>
      <CardHeader>
        <CardTitle>Register with Olwu</CardTitle>
        <CardDescription> Enter your information below to create your account </CardDescription>
      </CardHeader>
      <CardContent>
        <form @submit.prevent="onSubmit">
          <FieldGroup>
            <Field>
              <FieldLabel for="name"> Name </FieldLabel>
              <Input v-model="name" v-bind="nameAttrs" id="name" type="text" required />
              <div v-if="errors.name">{{ errors.name }}</div>
            </Field>
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
              <FieldDescription> We will not share your email with anyone else. </FieldDescription>
            </Field>
            <Field>
              <FieldLabel for="password"> Password </FieldLabel>
              <Input
                v-model="password"
                v-bind="passwordAttrs"
                id="password"
                type="password"
                required
              />
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
            <FieldGroup>
              <Field>
                <Button :disabled="auth.loading" type="submit"> Create Account </Button>
                <FieldDescription class="px-6 text-center">
                  Already have an account?
                  <router-link :to="{ name: 'login' }">Sign in</router-link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  </AuthLayout>
</template>
