<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Rule } from '@/types/domain'
import { renderContent } from '@/lib/renderContent'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useBookmarkStore } from '@/stores/bookmarks'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { Crosshair, Hash, Pencil, Star, Trash2 } from '@lucide/vue'
import EditRuleDialog from '@/components/systems/EditRuleDialog.vue'
import RenumberRuleDialog from '@/components/systems/RenumberRuleDialog.vue'
import DeleteRuleDialog from '@/components/systems/DeleteRuleDialog.vue'

interface Props {
  rule: Rule
  childrenMap: Map<string | null, Rule[]>
  depth: number
  tocDepth: number
  canEdit?: boolean
  /** When true, children are not rendered. Used when the parent is managing child rendering externally (e.g. range mode). */
  standalone?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{ selectRule: [rule: Rule]; ruleDeleted: [] }>()

const appSettings = useAppSettingsStore()
const bookmarkStore = useBookmarkStore()
const panelStore = useLeftPanelStore()

const editDialogOpen = ref(false)
const editingRule = ref<Rule | null>(null)

const renumberDialogOpen = ref(false)
const renumberingRule = ref<Rule | null>(null)

const deleteDialogOpen = ref(false)
const deletingRule = ref<Rule | null>(null)

function openEditDialog(rule: Rule): void {
  editingRule.value = rule
  editDialogOpen.value = true
}

function openRenumberDialog(rule: Rule): void {
  renumberingRule.value = rule
  renumberDialogOpen.value = true
}

function openDeleteDialog(rule: Rule): void {
  deletingRule.value = rule
  deleteDialogOpen.value = true
}

function showInTree(): void {
  panelStore.openToTab('tree')
  panelStore.treeActivatedTick++
}

function headingTag(depth: number): string {
  return `h${Math.min(depth + 2, 6)}`
}

function headingClass(depth: number): string {
  const sizeMap: Record<number, string> = {
    0: 'text-xl',
    1: 'text-lg',
    2: 'text-base',
    3: 'text-sm',
    4: 'text-sm',
    5: 'text-sm',
  }
  return `font-semibold mb-1 ${sizeMap[depth] ?? 'text-sm'}`
}

const childRules = computed((): Rule[] => props.childrenMap.get(props.rule.id) ?? [])
</script>

<template>
  <!-- Rule header -->
  <div class="flex items-baseline gap-3 group">
    <component :is="headingTag(depth)" :class="[headingClass(depth), 'flex-1 min-w-0']">
      <span
        class="font-mono text-primary pr-1 cursor-pointer hover:underline"
        @click="emit('selectRule', rule)"
        >{{ rule.number }}</span
      >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span :data-rule-context="rule.module_id" v-html="renderContent(rule.title)" />
    </component>
    <div
      class="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
    >
      <button
        v-if="canEdit"
        class="p-1 rounded hover:bg-muted/40 transition-colors"
        title="Edit rule"
        @click="openEditDialog(rule)"
      >
        <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <button
        v-if="canEdit"
        class="p-1 rounded hover:bg-muted/40 transition-colors"
        title="Renumber rule"
        @click="openRenumberDialog(rule)"
      >
        <Hash class="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <button
        v-if="canEdit"
        class="p-1 rounded hover:bg-muted/40 transition-colors"
        title="Delete rule"
        @click="openDeleteDialog(rule)"
      >
        <Trash2 class="w-3.5 h-3.5 text-muted-foreground" />
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
        :title="bookmarkStore.isBookmarked('rule', rule.id) ? 'Remove bookmark' : 'Bookmark rule'"
        @click="
          bookmarkStore.isBookmarked('rule', rule.id)
            ? bookmarkStore.removeBookmark('rule', rule.id)
            : bookmarkStore.addBookmark('rule', rule.id)
        "
      >
        <Star
          class="w-3.5 h-3.5 transition-colors"
          :class="
            bookmarkStore.isBookmarked('rule', rule.id)
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-muted-foreground'
          "
        />
      </button>
    </div>
  </div>

  <!-- Rule content -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <p
    class="text-foreground/80 text-sm leading-relaxed mb-4 whitespace-pre-wrap"
    :data-rule-context="rule.module_id"
    v-html="
      renderContent(rule.content, {
        acronymPopups: appSettings.acronymPopups,
      })
    "
  />

  <!-- Children -->
  <template v-if="!standalone">
    <div v-for="child in childRules" :key="child.id" class="mt-4">
      <RuleDetailChildren
        :rule="child"
        :children-map="childrenMap"
        :depth="depth + 1"
        :toc-depth="tocDepth"
        :can-edit="canEdit"
        @select-rule="emit('selectRule', $event)"
        @rule-deleted="emit('ruleDeleted')"
      />
    </div>
  </template>

  <EditRuleDialog
    v-if="editingRule"
    :open="editDialogOpen"
    :rule="editingRule"
    @update:open="editDialogOpen = $event"
  />

  <RenumberRuleDialog
    v-if="renumberingRule"
    :open="renumberDialogOpen"
    :rule="renumberingRule"
    @update:open="renumberDialogOpen = $event"
  />

  <DeleteRuleDialog
    v-if="deletingRule"
    :open="deleteDialogOpen"
    :rule="deletingRule"
    @update:open="deleteDialogOpen = $event"
    @deleted="emit('ruleDeleted')"
  />
</template>
