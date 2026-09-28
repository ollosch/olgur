<script setup lang="ts">
import { computed } from 'vue'
import { useCacheStore } from '@/stores/cacheStore'
import { useContentStore } from '@/stores/content'
import { useOnline } from '@/composables/useOnline'
import { formatBytes } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

const props = defineProps<{ systemId: string }>()

const cacheStore = useCacheStore()
const contentStore = useContentStore()
const { online } = useOnline()

const meta = computed(() =>
  cacheStore.cachedSystems.find((entry) => entry.systemId === props.systemId),
)
const isCached = computed(() => meta.value !== undefined)
const pinning = computed(() => cacheStore.pinInProgress.has(props.systemId))

function versionSignature(joined: string): string {
  return joined
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .sort()
    .join(', ')
}

const currentVersionString = computed(() => {
  const versions = Object.values(contentStore.manifestByModule).map((e) => e.version_string)
  return [...new Set(versions)].join(', ')
})

const newVersionAvailable = computed(() => {
  if (!online.value || !meta.value || currentVersionString.value === '') return false
  return versionSignature(meta.value.versionString) !== versionSignature(currentVersionString.value)
})

async function toggle(checked: boolean): Promise<void> {
  if (checked) await cacheStore.pinSystem(props.systemId)
  else await cacheStore.unpinSystem(props.systemId)
}
</script>

<template>
  <div class="flex items-center gap-1.5 shrink-0">
    <span class="text-xs text-muted-foreground whitespace-nowrap">Offline</span>
    <Switch :model-value="isCached" :disabled="pinning" @update:model-value="toggle" />
    <Badge v-if="isCached" variant="secondary" class="text-xs">Cached</Badge>
    <span v-if="meta" class="text-xs text-muted-foreground whitespace-nowrap">
      {{ formatBytes(meta.size) }}
    </span>
    <Badge
      v-if="newVersionAvailable"
      variant="outline"
      class="text-xs text-amber-600 border-amber-400/50"
    >
      Update available
    </Badge>
  </div>
</template>
