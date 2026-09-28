<script setup lang="ts">
import { useOnline } from '@/composables/useOnline'

const { offline } = useOnline()
</script>

<template>
  <div
    v-if="offline"
    class="bg-amber-500/15 border-b border-amber-500/30 text-amber-400 text-xs font-medium px-4 py-1.5 text-center"
  >
    You are offline — showing cached content in read-only mode.
  </div>
</template>
