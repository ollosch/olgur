<script setup lang="ts">
import { computed } from 'vue'
import type { Rule } from '@/types/domain'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, Minus } from 'lucide-vue-next'
import { useLeftPanelStore } from '@/stores/leftPanel'

interface Props {
  rule: Rule
  allRules: Rule[]
  selectedId: string | null
  depth: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ select: [rule: Rule] }>()

const panelStore = useLeftPanelStore()

const open = computed(() => panelStore.expandedRuleIds.has(props.rule.id))

const hasChildren = computed(() => props.allRules.some((r) => r.parent_id === props.rule.id))

function children(parentId: string): Rule[] {
  return props.allRules
    .filter((r) => r.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

function toggle(): void {
  if (hasChildren.value) {
    if (open.value) {
      panelStore.expandedRuleIds.delete(props.rule.id)
    } else {
      panelStore.expandedRuleIds.add(props.rule.id)
    }
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (hasChildren.value && !open.value) {
      panelStore.expandedRuleIds.add(props.rule.id)
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (open.value) {
      panelStore.expandedRuleIds.delete(props.rule.id)
    } else {
      // Move focus to the parent node button (if any)
      const el = e.currentTarget as HTMLElement
      const container = el.closest('[data-tree-container]')
      if (!container) return
      const allNodes = Array.from(container.querySelectorAll<HTMLElement>('button[data-tree-node]'))
      const myIndex = allNodes.indexOf(el)
      // Walk backwards to find a node at a shallower depth
      const myDepth = Number(el.dataset['depth'] ?? 0)
      for (let i = myIndex - 1; i >= 0; i--) {
        const candidate = allNodes[i]
        if (candidate && Number(candidate.dataset['depth'] ?? 0) < myDepth) {
          candidate.focus()
          break
        }
      }
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    emit('select', props.rule)
  }
  // ArrowUp / ArrowDown are handled at the tree container level in LeftPanelContent
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
        tabindex="-1"
        @click.stop="toggle"
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
          'flex-1 flex items-baseline gap-1.5 px-1 py-0.5 text-sm rounded text-left hover:bg-muted/30 transition-colors truncate focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          selectedId === rule.id ? 'text-primary bg-muted/50' : 'text-foreground/80',
        )"
        tabindex="0"
        data-tree-node
        :data-rule-id="rule.id"
        :data-depth="depth"
        @click="emit('select', rule)"
        @keydown="onKeyDown"
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
