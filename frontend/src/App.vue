<script setup lang="ts">
import 'vue-sonner/style.css'
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <div>
    <router-view class="dark bg-background text-foreground" />
    <Toaster />
  </div>
</template>
