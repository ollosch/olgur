<script setup lang="ts">
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import { useCacheStore, versionSignature } from '@/stores/cacheStore'
import { useContentStore } from '@/stores/content'
import { useOnline } from '@/composables/useOnline'
import { DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'

const props = defineProps<{ systemId: string }>()

const cacheStore = useCacheStore()
const contentStore = useContentStore()
const { online } = useOnline()

const meta = computed(() =>
  cacheStore.cachedSystems.find((entry) => entry.systemId === props.systemId),
)
const isCached = computed(() => meta.value !== undefined)
const pinning = computed(() => cacheStore.pinInProgress.has(props.systemId))

/** At least one module must expose a released snapshot we can download. */
const hasPinnableContent = computed(() =>
  Object.values(contentStore.manifestByModule).some(
    (entry) => entry.content != null && entry.version_id != null,
  ),
)

/** Only an uncached system can be unavailable; cached systems stay removable. */
const unavailable = computed(
  () => !isCached.value && (!online.value || !hasPinnableContent.value),
)

/** When cached, the toggle removes the offline copy — label it as the delete it is. */
const label = computed(() => {
  if (isCached.value) return 'Delete from cache'
  if (!online.value) return 'Offline — connect to cache'
  if (!hasPinnableContent.value) return 'No released version to cache'
  return 'Make available offline'
})

const tooltip = computed(() => {
  if (isCached.value) return 'Remove this system from the offline cache'
  if (!online.value) return 'Connect to the internet to make this system available offline'
  if (!hasPinnableContent.value) return 'No released version to cache'
  return 'Cache this system for offline reading'
})

const currentVersionString = computed(() => {
  const versions = Object.values(contentStore.manifestByModule)
    .map((e) => e.version_string)
    .filter((value): value is string => value != null)
  return [...new Set(versions)].join(', ')
})

const newVersionAvailable = computed(() => {
  if (!online.value || !meta.value || currentVersionString.value === '') return false
  return versionSignature(meta.value.versionString) !== versionSignature(currentVersionString.value)
})

async function toggle(checked: boolean): Promise<void> {
  if (checked) {
    try {
      const outcome = await cacheStore.pinSystem(props.systemId)
      if (outcome === 'pinned') {
        toast.success('System is now available offline.')
      } else if (outcome === 'request-failed') {
        toast.error('Could not load this system. Please try again.')
      } else if (outcome === 'no-content') {
        toast.error('There is no released version to cache.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cache this system offline.')
    }
  } else {
    try {
      await cacheStore.unpinSystem(props.systemId)
      toast.success('System removed from the offline cache.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove this system from the cache.',
      )
    }
  }
}
</script>

<template>
  <DropdownMenuCheckboxItem
    :model-value="isCached"
    :disabled="pinning || unavailable"
    :title="tooltip"
    @update:model-value="toggle"
  >
    <span :class="isCached ? 'text-destructive' : undefined">{{ label }}</span>
    <span v-if="newVersionAvailable" class="ml-auto text-xs text-amber-500"> Update available </span>
  </DropdownMenuCheckboxItem>
</template>
