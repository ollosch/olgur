<script setup lang="ts">
import AuthLayout from '@/views/Auth/AuthLayout.vue'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const historyNotEmpty = window.history.state?.back !== null
</script>

<template>
  <AuthLayout>
    <Card>
      <CardHeader>
        <CardTitle>404 - Not Found</CardTitle>
        <CardDescription> The page you are looking for does not exist. </CardDescription>
      </CardHeader>
      <CardContent>
        <span v-if="historyNotEmpty">
          <button @click="$router.back()" class="text-blue-500 underline mr-2 cursor-pointer">
            Go back</button
          >, or
        </span>
        <router-link :to="{ name: 'rules' }" :replace="true" class="text-blue-500 underline"
          >Go home</router-link
        >
      </CardContent>
    </Card>
  </AuthLayout>
</template>
