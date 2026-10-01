<script setup lang="ts">
import { useVersionStatus } from '@/composables/useVersionStatus'

const props = defineProps<{
  moduleId: string
}>()

const { isLiveContent, hasReleasedVersion, displayVersion } = useVersionStatus(() => props.moduleId)
</script>

<template>
  <span
    v-if="isLiveContent"
    :class="hasReleasedVersion ? 'bg-emerald-500' : 'bg-amber-500'"
    :title="hasReleasedVersion ? `Released: ${displayVersion}` : 'No released version'"
    class="ml-1.5 inline-block h-2 w-2 shrink-0 rounded-full align-middle"
    data-test="version-status-dot"
  />
</template>
