<script setup lang="ts">
import { useVersionStatus } from '@/composables/useVersionStatus'

const props = defineProps<{
  moduleId: string
}>()

const { isLiveContent, hasReleasedVersion, displayVersion, revision, versionString } =
  useVersionStatus(() => props.moduleId)
</script>

<template>
  <div
    v-if="isLiveContent"
    class="flex items-center gap-2 border-b border-zinc-700/50 bg-zinc-800/60 px-4 py-1.5 text-xs text-zinc-400"
  >
    <span>You are editing a draft.</span>
    <template v-if="hasReleasedVersion">
      <span aria-hidden="true" class="text-zinc-600">·</span>
      <span v-if="revision > 0">
        Current released version: v{{ versionString }} ({{ revision }}
        editorial
        {{ revision === 1 ? 'correction' : 'corrections' }}
        applied)
      </span>
      <span v-else>Current released version: {{ displayVersion }}</span>
    </template>
    <template v-else>
      <span aria-hidden="true" class="text-zinc-600">·</span>
      <span>No released version yet.</span>
    </template>
  </div>
</template>
