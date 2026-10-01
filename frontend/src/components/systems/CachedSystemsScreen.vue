<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCacheStore } from '@/stores/cacheStore'
import { formatBytes } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const router = useRouter()
const cacheStore = useCacheStore()

onMounted(() => {
  cacheStore.estimateStorage()
})

const usagePercent = computed(() =>
  cacheStore.quota > 0 ? Math.min(100, (cacheStore.bytesUsed / cacheStore.quota) * 100) : 0,
)

function openSystem(systemId: string): void {
  router.push({ name: 'system', params: { systemId } })
}

async function unpin(systemId: string): Promise<void> {
  await cacheStore.unpinSystem(systemId)
}
</script>

<template>
  <section class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted-foreground uppercase tracking-widest">Storage</span>
      <span class="text-xs text-muted-foreground">
        {{ formatBytes(cacheStore.bytesUsed)
        }}<template v-if="cacheStore.quota > 0"> of {{ formatBytes(cacheStore.quota) }}</template>
        used
      </span>
    </div>

    <Progress v-if="cacheStore.quota > 0" :model-value="usagePercent" class="h-1.5 bg-muted" />

    <div
      v-if="cacheStore.cachedSystems.length === 0"
      class="text-sm text-muted-foreground py-6 text-center"
    >
      No systems cached for offline use.
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="entry in cacheStore.cachedSystems"
        :key="entry.systemId"
        class="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3"
      >
        <button class="flex-1 min-w-0 text-left" @click="openSystem(entry.systemId)">
          <div class="text-foreground font-medium truncate">{{ entry.name }}</div>
          <div class="text-xs text-muted-foreground">v{{ entry.versionString }}</div>
        </button>
        <span class="text-xs text-muted-foreground shrink-0">{{ formatBytes(entry.size) }}</span>
        <Button
          variant="ghost"
          size="sm"
          class="text-xs h-6 text-destructive hover:text-destructive shrink-0"
          :disabled="cacheStore.pinInProgress.has(entry.systemId)"
          @click="unpin(entry.systemId)"
        >
          Unpin
        </Button>
      </li>
    </ul>
  </section>
</template>
