<script setup lang="ts">
import { useVersionStatus } from '@/composables/useVersionStatus'

const props = defineProps<{
  moduleId: string
}>()

const { isDesigner, hasReleasedVersion, displayVersion } = useVersionStatus(() => props.moduleId)
</script>

<template>
  <template v-if="isDesigner">
    <span
      v-if="!hasReleasedVersion"
      class="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400"
    >
      Draft only — no released version
    </span>
    <span
      v-else
      class="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400"
    >
      Released: {{ displayVersion }}
    </span>
  </template>
</template>
