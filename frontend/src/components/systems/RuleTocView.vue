<script setup lang="ts">
import { computed } from 'vue'
import type { Rule } from '@/types/domain'
import { renderContent } from '@/lib/renderContent'

interface Props {
  rule: Rule
  childrenMap: Map<string | null, Rule[]>
}

const props = defineProps<Props>()
const emit = defineEmits<{ select: [rule: Rule] }>()

const children = computed(() => props.childrenMap.get(props.rule.id) ?? [])
</script>

<template>
  <div>
    <div v-if="children.length > 0">
      <button
        v-for="child in children"
        :key="child.id"
        class="w-full flex items-baseline gap-3 py-1 rounded-md hover:bg-muted/40 transition-colors text-left group"
        @click="emit('select', child)"
      >
        <span class="font-mono text-sm text-primary font-semibold shrink-0 w-16 text-right">
          {{ child.number }}
        </span>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span
          class="text-foreground/90 text-sm group-hover:text-foreground transition-colors"
          v-html="renderContent(child.title)"
        />
      </button>
    </div>
  </div>
</template>
