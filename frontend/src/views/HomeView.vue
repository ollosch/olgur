<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useCacheStore } from '@/stores/cacheStore'

import { Button } from '@/components/ui/button'
import SystemCard from '@/components/systems/SystemCard.vue'
import CreateSystemDialog from '@/components/systems/CreateSystemDialog.vue'
import CachedSystemsScreen from '@/components/systems/CachedSystemsScreen.vue'

const systemStore = useSystemStore()
const membershipStore = useMembershipStore()
const authStore = useAuthStore()
const cacheStore = useCacheStore()

const showCreateDialog = ref(false)
const initialLoading = ref(true)

const isGuest = computed(() => !authStore.user)

onMounted(async () => {
  if (!isGuest.value) {
    await systemStore.init()
  }

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
        <Button v-if="authStore.user" variant="ghost" size="sm" @click="logout">Logout</Button>
        <Button v-else variant="ghost" size="sm" @click="router.push({ name: 'login' })">
          Sign in
        </Button>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-4xl mx-auto px-6 py-8">
      <div v-if="initialLoading" class="text-muted-foreground text-sm">Loading...</div>

      <!-- Offline / logged-out landing: cached systems only -->
      <div v-else-if="isGuest" class="space-y-6">
        <div class="flex items-center justify-between">
          <h1 class="text-foreground text-xl font-semibold">Cached systems</h1>
          <Button size="sm" @click="router.push({ name: 'login' })">Sign in</Button>
        </div>
        <p class="text-muted-foreground text-sm">
          You are offline. Open a cached system to browse it read-only.
        </p>
        <CachedSystemsScreen />
      </div>

      <div v-else class="space-y-6">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-foreground text-xl font-semibold">Systems</h1>
          <Button size="sm" @click="showCreateDialog = true">+ New System</Button>
        </div>

        <!-- Your Systems -->
        <div v-if="membershipStore.memberSystems.length > 0">
          <div class="text-xs text-muted-foreground uppercase tracking-widest mb-3">
            Your Systems
          </div>
          <div class="space-y-2">
            <SystemCard
              v-for="system in membershipStore.memberSystems"
              :key="system.id"
              :system="system"
              :membership="membershipStore.membershipsBySystem[system.id]"
            />
          </div>
        </div>

        <!-- Other Systems -->
        <div v-if="membershipStore.otherSystems.length > 0">
          <div class="text-xs text-muted-foreground uppercase tracking-widest mb-3">
            Other Systems
          </div>
          <div class="space-y-2">
            <SystemCard
              v-for="system in membershipStore.otherSystems"
              :key="system.id"
              :system="system"
              :membership="membershipStore.membershipsBySystem[system.id]"
            />
          </div>
        </div>

        <div
          v-if="systemStore.systems.length === 0"
          class="text-muted-foreground text-sm text-center py-12"
        >
          No systems yet. Create one to get started.
        </div>

        <!-- Cached systems -->
        <div v-if="cacheStore.cachedSystems.length > 0" class="pt-4 border-t border-border">
          <div class="text-xs text-muted-foreground uppercase tracking-widest mb-3">
            Cached systems
          </div>
          <CachedSystemsScreen />
        </div>
      </div>
    </main>

    <CreateSystemDialog v-if="!isGuest" v-model:open="showCreateDialog" />
  </div>
</template>
