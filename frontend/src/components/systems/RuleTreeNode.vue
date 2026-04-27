<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Rule } from '@/types/domain'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, Minus } from 'lucide-vue-next'

interface Props {
  rule: Rule
  allRules: Rule[]
  selectedId: string | null
  depth: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ select: [rule: Rule] }>()

const open = ref(false)

const hasChildren = computed(() => props.allRules.some((r) => r.parent_id === props.rule.id))

function children(parentId: string): Rule[] {
  return props.allRules
    .filter((r) => r.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
}
</script>

<template>
  <div>
    <div
      class="flex items-center gap-0.5 group"
      :style="{ paddingLeft: `${depth * 12}px` }"
    >
      <!-- chevron for parent nodes -->
      <button
        v-if="hasChildren"
        class="w-4 h-4 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        @click.stop="open = !open"
      >
        <ChevronDown v-if="open" class="w-3 h-3" />
        <ChevronRight v-else class="w-3 h-3" />
      </button>
      <!-- dot for leaf nodes -->
      <span v-else class="w-4 h-4 flex items-center justify-center shrink-0">
        <Minus class="w-2 h-2 text-muted-foreground/50" />
      </span>

      <!-- label -->
      <button
        :class="cn(
          'flex-1 flex items-baseline gap-1.5 px-1 py-0.5 text-sm rounded text-left hover:bg-muted/30 transition-colors truncate',
          selectedId === rule.id ? 'text-primary bg-muted/50' : 'text-foreground/80',
        )"
        @click="emit('select', rule)"
      >
        <span class="font-mono text-xs text-muted-foreground shrink-0">{{ rule.number }}</span>
        <span class="truncate">{{ rule.title }}</span>
      </button>
    </div>

    <!-- children -->
    <template v-if="open && hasChildren">
      <RuleTreeNode
        v-for="child in children(rule.id)"
        :key="child.id"
        :rule="child"
        :all-rules="allRules"
        :selected-id="selectedId"
        :depth="depth + 1"
        @select="emit('select', $event)"
      />
    </template>
  </div>
</template>
