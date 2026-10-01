<script setup lang="ts">
import { computed } from 'vue'
import { Check } from '@lucide/vue'
import { useProofreadStore } from '@/stores/proofread'
import type { ProofreadEntityType } from '@/types/domain'

interface Props {
  entityType: ProofreadEntityType
  entityId: string
  actionLabel?: string
}

const props = withDefaults(defineProps<Props>(), { actionLabel: '' })

const proofreadStore = useProofreadStore()

const count = computed(() => proofreadStore.countFor(props.entityId))
const marked = computed(() => proofreadStore.hasMarked(props.entityId))
const done = computed(() => proofreadStore.isDone(props.entityId))

const label = computed(() => (marked.value ? 'Remove' : props.actionLabel))

function toggle(): void {
  if (marked.value) {
    proofreadStore.remove(props.entityType, props.entityId)
  } else {
    proofreadStore.record(props.entityType, props.entityId)
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] transition-colors shrink-0"
    :class="
      marked || done ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/40'
    "
    :title="marked ? 'Remove proofread' : actionLabel"
    @click.stop="toggle"
  >
    <Check class="w-3 h-3" :class="done ? 'text-green-500' : ''" />
    <span>{{ label }}</span>
    <span class="font-mono text-muted-foreground">{{ count }}/{{ proofreadStore.threshold }}</span>
  </button>
</template>
