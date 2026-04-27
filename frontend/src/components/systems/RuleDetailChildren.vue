<script setup lang="ts">
import type { Rule } from '@/types/domain'
import { renderContent } from '@/lib/renderContent'
import { useAppSettingsStore } from '@/stores/appSettings'

interface Props {
  rule: Rule
  childrenMap: Map<string | null, Rule[]>
  depth: number
  tocDepth: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ selectRule: [rule: Rule] }>()

const appSettings = useAppSettingsStore()

function children(parentId: string): Rule[] {
  return props.childrenMap.get(parentId) ?? []
}

function headingLevel(childDepth: number, tocDepth: number): number {
  if (tocDepth === 0) return 1
  return Math.min(Math.max(childDepth - tocDepth + 2, 1), 6)
}

function headingClass(level: number): string {
  const sizeMap: Record<number, string> = {
    1: 'text-xl',
    2: 'text-lg',
    3: 'text-base',
    4: 'text-sm',
    5: 'text-sm',
    6: 'text-sm',
  }
  return `font-semibold mb-1 ${sizeMap[level] ?? 'text-sm'}`
}
</script>

<template>
  <div>
    <div
      v-for="child in children(rule.id)"
      :key="child.id"
      class="mt-3"
    >
      <component
        :is="`h${headingLevel(depth + 1, tocDepth)}`"
        :class="headingClass(headingLevel(depth + 1, tocDepth))"
      >
        <span class="font-mono text-primary">{{ child.number }}</span>
        {{ child.title }}
      </component>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p
        class="text-foreground/70 text-sm leading-relaxed mb-2 whitespace-pre-wrap"
        v-html="renderContent(child.content, { acronymPopups: appSettings.acronymPopups })"
      />
      <RuleDetailChildren
        :rule="child"
        :children-map="childrenMap"
        :depth="depth + 1"
        :toc-depth="tocDepth"
        @select-rule="emit('selectRule', $event)"
      />
    </div>
  </div>
</template>
