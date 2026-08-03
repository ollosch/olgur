<script setup lang="ts">
import { useGlobalShortcuts } from '@/composables/useGlobalShortcuts'

import RulePopupOverlay from '@/components/RulePopupOverlay.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import LeaveSystemConfirmDialog from '@/components/systems/LeaveSystemConfirmDialog.vue'
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/auth'

useGlobalShortcuts()

const authStore = useAuthStore()
</script>

<template>
  <div class="dark">
    <template v-if="authStore.initialized">
      <router-view class="bg-background text-foreground" />
      <Toaster />
      <RulePopupOverlay />
      <GlobalSearchOverlay />
      <LeaveSystemConfirmDialog />
    </template>
    <template v-else>
      <div class="bg-background text-foreground flex min-h-screen items-center justify-center">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
        />
      </div>
    </template>
  </div>
</template>
