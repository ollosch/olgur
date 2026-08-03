<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { useAuthStore } from '@/stores/auth'
import type { UpdateProfileRequest } from '@/types/domain'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { toast } from 'vue-sonner'
import { ArrowLeft } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()

const { defineField, handleSubmit, setErrors } = useForm<UpdateProfileRequest>({
  initialValues: {
    name: authStore.user?.name ?? '',
    email: authStore.user?.email ?? '',
  },
})

const [name, nameAttrs] = defineField('name')
const [email, emailAttrs] = defineField('email')

const onSubmit = handleSubmit(async (values) => {
  const result = await authStore.updateProfile(values)

  if (!result.ok) {
    setErrors(result.errors)
    return
  }

  toast.success('Profile updated.')
})

function goBack(): void {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push({ name: 'home' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <header class="border-b border-border px-6 py-3 flex items-center gap-3">
      <Button variant="ghost" size="icon" class="w-8 h-8" @click="goBack()">
        <ArrowLeft class="w-4 h-4" />
      </Button>
      <span class="text-foreground font-semibold text-sm">User Profile</span>
    </header>

    <main class="max-w-lg mx-auto px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your name and email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <form class="space-y-5" @submit="onSubmit">
            <FieldGroup>
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input v-model="name" v-bind="nameAttrs" type="text" autocomplete="name" />
              </Field>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input v-model="email" v-bind="emailAttrs" type="email" autocomplete="email" />
              </Field>
            </FieldGroup>

            <Button :disabled="authStore.loading" type="submit" class="w-full">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  </div>
</template>
