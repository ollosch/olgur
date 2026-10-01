<script setup lang="ts">
import { computed } from 'vue'
import { useVersionStatus } from '@/composables/useVersionStatus'

const props = defineProps<{
  moduleId: string
  showDetails?: boolean
}>()

const { isLiveContent, hasReleasedVersion, displayVersion, releasedAt } = useVersionStatus(
  () => props.moduleId,
)

const releasedDate = computed(() => (releasedAt.value ? releasedAt.value.slice(0, 10) : null))
</script>

<template>
  <span v-if="isLiveContent" class="ml-1.5 inline-flex items-center gap-1.5 align-middle">
    <span
      :class="hasReleasedVersion ? 'bg-emerald-500' : 'bg-amber-500'"
      :title="hasReleasedVersion ? `Released: ${displayVersion}` : 'No released version'"
      class="inline-block h-2 w-2 shrink-0 rounded-full"
      data-test="version-status-dot"
    />
    <span
      v-if="showDetails && hasReleasedVersion && releasedDate"
      class="text-xs text-muted-foreground"
    >
      {{ displayVersion }} · {{ releasedDate }}
    </span>
  </span>
</template>
