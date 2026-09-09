<script setup lang="ts">
import { computed } from 'vue'
import { useContentStore } from '@/stores/content'

// Placeholder for the deployed ordnance-versus-armor calculator. It consumes
// canonical `ordnance` (and `vehicle`) game data, never user-authored code.
const contentStore = useContentStore()

const ordnance = computed(() => contentStore.allGameData.filter((d) => d.type === 'ordnance'))
</script>

<template>
  <div class="h-full overflow-y-auto p-6">
    <h3 class="text-sm font-semibold text-foreground mb-2">Ordnance vs Armor</h3>
    <p class="text-sm text-muted-foreground mb-4">
      This calculator operates over canonical ordnance and vehicle data.
    </p>
    <p v-if="ordnance.length === 0" class="text-xs text-muted-foreground italic">
      No ordnance data available.
    </p>
    <ul v-else class="space-y-1">
      <li v-for="item in ordnance" :key="item.id" class="text-xs text-foreground/80">
        {{ item.name }}
      </li>
    </ul>
  </div>
</template>
