<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSystemStore } from '@/stores/system'

import { Button } from '@/components/ui/button'
import SystemCard from '@/components/systems/SystemCard.vue'
import CreateSystemDialog from '@/components/systems/CreateSystemDialog.vue'

const systemStore = useSystemStore()
const authStore = useAuthStore()

const showCreateDialog = ref(false)
const initialLoading = ref(true)

onMounted(async () => {
  await systemStore.init()

  initialLoading.value = false
})

const router = useRouter()

async function logout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="border-b border-border px-6 py-3 flex items-center justify-between">
      <span class="text-primary font-bold tracking-widest text-lg">OLGUR</span>
      <div class="flex items-center gap-4">
        <span class="text-muted-foreground text-sm">{{ authStore.user?.name }}</span>
        <Button variant="ghost" size="sm" @click="logout">Logout</Button>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-4xl mx-auto px-6 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-foreground text-xl font-semibold">Systems</h1>
        <Button size="sm" @click="showCreateDialog = true">+ New System</Button>
      </div>

      <div v-if="initialLoading" class="text-muted-foreground text-sm">Loading...</div>

      <div v-else class="space-y-6">
        <!-- Your Systems -->
        <div v-if="systemStore.memberSystems.length > 0">
          <div class="text-xs text-muted-foreground uppercase tracking-widest mb-3">
            Your Systems
          </div>
          <div class="space-y-2">
            <SystemCard
              v-for="system in systemStore.memberSystems"
              :key="system.id"
              :system="system"
              :membership="systemStore.membershipsBySystem[system.id]"
            />
          </div>
        </div>

        <!-- Other Systems -->
        <div v-if="systemStore.otherSystems.length > 0">
          <div class="text-xs text-muted-foreground uppercase tracking-widest mb-3">
            Other Systems
          </div>
          <div class="space-y-2">
            <SystemCard
              v-for="system in systemStore.otherSystems"
              :key="system.id"
              :system="system"
              :membership="systemStore.membershipsBySystem[system.id]"
            />
          </div>
        </div>

        <div
          v-if="systemStore.systems.length === 0"
          class="text-muted-foreground text-sm text-center py-12"
        >
          No systems yet. Create one to get started.
        </div>
      </div>
    </main>

    <CreateSystemDialog v-model:open="showCreateDialog" />
  </div>
</template>
