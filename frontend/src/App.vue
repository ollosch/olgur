<script setup lang="ts">
import { useGlobalShortcuts } from '@/composables/useGlobalShortcuts'

import RulePopupOverlay from '@/components/RulePopupOverlay.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'

useGlobalShortcuts()
</script>

<template>
  <div class="dark">
    <router-view class="bg-background text-foreground" />
    <Toaster />
    <RulePopupOverlay />
    <GlobalSearchOverlay />
  </div>
</template>
