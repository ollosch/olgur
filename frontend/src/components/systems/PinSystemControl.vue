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

/** When cached, the toggle removes the offline copy — label it as the delete it is. */
const label = computed(() => (isCached.value ? 'Delete from cache' : 'Make available offline'))

const currentVersionString = computed(() => {
  const versions = Object.values(contentStore.manifestByModule).map((e) => e.version_string)
  return [...new Set(versions)].join(', ')
})

const newVersionAvailable = computed(() => {
  if (!online.value || !meta.value || currentVersionString.value === '') return false
  return versionSignature(meta.value.versionString) !== versionSignature(currentVersionString.value)
})

async function toggle(checked: boolean): Promise<void> {
  if (checked) {
    try {
      await cacheStore.pinSystem(props.systemId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cache this system offline.')
    }
  } else {
    await cacheStore.unpinSystem(props.systemId)
  }
}
</script>

<template>
  <DropdownMenuCheckboxItem :model-value="isCached" :disabled="pinning" @update:model-value="toggle">
    <span :class="isCached ? 'text-destructive' : undefined">{{ label }}</span>
    <span v-if="newVersionAvailable" class="ml-auto text-xs text-amber-500"> Update available </span>
  </DropdownMenuCheckboxItem>
</template>
