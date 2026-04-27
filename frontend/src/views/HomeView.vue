<script setup lang="ts">
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

import { Button } from '@/components/ui/button'

const auth = useAuthStore()

const logout = async () => {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <h1>Welcome Home</h1>
  <Button @click="logout">Logout</Button>
</template>
