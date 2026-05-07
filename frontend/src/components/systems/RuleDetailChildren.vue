<script setup lang="ts">
import { ref } from 'vue'
import type { Rule } from '@/types/domain'
import { renderContent } from '@/lib/renderContent'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useBookmarkStore } from '@/stores/bookmarks'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { Crosshair, Pencil, Star } from 'lucide-vue-next'
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
const bookmarkStore = useBookmarkStore()
const panelStore = useLeftPanelStore()

const editDialogOpen = ref(false)
const editingRule = ref<Rule | null>(null)

function openEditDialog(rule: Rule): void {
  editingRule.value = rule
  editDialogOpen.value = true
}

function showInTree(): void {
  panelStore.openToTab('tree')
  panelStore.treeActivatedTick++
}

function childRules(parentId: string): Rule[] {
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
      v-for="child in childRules(rule.id)"
      :key="child.id"
      class="mt-4 flow-root"
    >
      <div class="flex items-baseline gap-3 group">
        <component
          :is="`h${headingLevel(depth + 1, tocDepth)}`"
          :class="[headingClass(headingLevel(depth + 1, tocDepth)), 'flex-1 min-w-0']"
        >
          <span class="font-mono text-primary pr-1 cursor-pointer hover:underline" @click="emit('selectRule', child)">{{ child.number }}</span>
          {{ child.title }}
        </component>
        <div class="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            v-if="canEdit"
            class="p-1 rounded hover:bg-muted/40 transition-colors"
            title="Edit rule"
            @click="openEditDialog(child)"
          >
            <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            class="p-1 rounded hover:bg-muted/40 transition-colors"
            title="Show in tree"
            @click="showInTree()"
          >
            <Crosshair class="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button
            class="p-1 rounded hover:bg-muted/40 transition-colors"
            :title="bookmarkStore.isBookmarked('rule', child.id) ? 'Remove bookmark' : 'Bookmark rule'"
            @click="bookmarkStore.isBookmarked('rule', child.id)
              ? bookmarkStore.removeBookmark('rule', child.id)
              : bookmarkStore.addBookmark('rule', child.id)"
          >
            <Star
              class="w-3.5 h-3.5 transition-colors"
              :class="bookmarkStore.isBookmarked('rule', child.id) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'"
            />
          </button>
        </div>
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
        :can-edit="canEdit"
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
