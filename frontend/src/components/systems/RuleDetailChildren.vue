<script setup lang="ts">
import type { Rule } from '@/types/domain'
import { renderContent } from '@/lib/renderContent'

interface Props {
  rule: Rule
  childrenMap: Map<string | null, Rule[]>
  depth: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ selectRule: [rule: Rule] }>()

function children(parentId: string): Rule[] {
  return props.childrenMap.get(parentId) ?? []
}
</script>

<template>
  <div :style="{ marginLeft: depth > 0 ? '16px' : '0' }">
    <div
      v-for="child in children(rule.id)"
      :key="child.id"
      class="mt-3"
    >
      <div class="flex items-baseline gap-2 mb-1">
        <span class="font-mono text-xs text-primary">{{ child.number }}</span>
        <span class="text-foreground font-medium text-sm">{{ child.title }}</span>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p
        class="text-foreground/70 text-sm leading-relaxed mb-2 whitespace-pre-wrap"
        v-html="renderContent(child.content)"
      />
      <RuleDetailChildren
        :rule="child"
        :children-map="childrenMap"
        :depth="depth + 1"
        @select-rule="emit('selectRule', $event)"
      />
    </div>
  </div>
</template>
