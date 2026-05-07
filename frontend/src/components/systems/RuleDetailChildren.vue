<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Rule } from '@/types/domain'
import { renderContent } from '@/lib/renderContent'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useAuthorization } from '@/composables/useAuthorization'
import { Pencil } from 'lucide-vue-next'
import EditRuleDialog from '@/components/systems/EditRuleDialog.vue'

interface Props {
  rule: Rule
  childrenMap: Map<string | null, Rule[]>
  depth: number
  tocDepth: number
  canEdit?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ selectRule: [rule: Rule] }>()

const appSettings = useAppSettingsStore()
const { canEdit } = useAuthorization()

const canEditRules = computed((): boolean => {
  if (props.canEdit !== undefined) return props.canEdit
  return canEdit.value(props.rule.module_id)
})

const editDialogOpen = ref(false)
const editingRule = ref<Rule | null>(null)

function openEditDialog(rule: Rule): void {
  editingRule.value = rule
  editDialogOpen.value = true
}

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
      class="mt-4 flow-root"
    >
      <div class="flex items-baseline gap-2 group">
        <component
          :is="`h${headingLevel(depth + 1, tocDepth)}`"
          :class="[headingClass(headingLevel(depth + 1, tocDepth)), 'flex-1']"
        >
          <span class="font-mono text-primary pr-1 cursor-pointer hover:underline" @click="emit('selectRule', child)">{{ child.number }}</span>
          <span v-html="child.title"></span>
        </component>
        <button
          v-if="canEditRules"
          class="p-1 rounded hover:bg-muted/40 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          title="Edit rule"
          @click="openEditDialog(child)"
        >
          <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p
        class="text-foreground/75 text-sm leading-relaxed mb-2 whitespace-pre-wrap"
        v-html="renderContent(child.content, { acronymPopups: appSettings.acronymPopups })"
      />
      <RuleDetailChildren
        :rule="child"
        :children-map="childrenMap"
        :depth="depth + 1"
        :toc-depth="tocDepth"
        :can-edit="canEditRules"
        @select-rule="emit('selectRule', $event)"
      />
    </div>
  </div>

  <EditRuleDialog
    v-if="editingRule"
    :open="editDialogOpen"
    :rule="editingRule"
    @update:open="editDialogOpen = $event"
  />
</template>
