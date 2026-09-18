<script setup lang="ts">
import { ref, computed } from 'vue'
import type { IndexEntry } from '@/types/domain'
import { ChevronDown, ChevronRight, Pencil } from '@lucide/vue'
import { renderContent } from '@/lib/renderContent'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useContentStore } from '@/stores/content'
import { useAuthorization } from '@/composables/useAuthorization'
import EditIndexEntryDialog from '@/components/systems/EditIndexEntryDialog.vue'

interface Props {
  entry: IndexEntry
  depth?: number
}

const props = withDefaults(defineProps<Props>(), { depth: 0 })
const emit = defineEmits<{ seeAlsoClick: [term: string] }>()

const appSettings = useAppSettingsStore()
const contentStore = useContentStore()
const { canEdit } = useAuthorization()

const expanded = ref(false)
const editDialogOpen = ref(false)

const children = computed((): IndexEntry[] =>
  (contentStore.indexEntriesByParent.get(props.entry.id) ?? []).filter((c) =>
    contentStore.visibleIndexEntryIds.has(c.id),
  ),
)
const hasChildren = computed(() => children.value.length > 0)

function activeRuleRefs(entry: IndexEntry): string[] {
  return (entry.relations?.rule_refs ?? []).filter((r) =>
    contentStore.hasRuleReference(r, entry.module_id),
  )
}
</script>

<template>
  <div
    :style="depth > 0 ? { paddingLeft: `${depth * 12}px` } : {}"
    class="py-2 border-b border-border/50 last:border-0"
  >
    <!-- Term line -->
    <div class="flex items-baseline justify-between gap-2 group">
      <p class="text-xs font-semibold text-foreground">
        <span v-if="depth === 0 && entry.parent_id" class="text-xs text-muted-foreground">
          <span
            :data-rule-context="entry.module_id"
            v-html="renderContent(contentStore.indexEntriesById.get(entry.parent_id)?.term ?? '')"
          ></span>
          ›
        </span>
        <span :data-rule-context="entry.module_id" v-html="renderContent(entry.term)"></span>
        <button
          v-if="canEdit(entry.module_id)"
          type="button"
          class="p-1 rounded hover:bg-muted/40 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          title="Edit entry"
          @click="editDialogOpen = true"
        >
          <Pencil class="w-3 h-3 text-muted-foreground" />
        </button>
      </p>
      <div class="flex items-center gap-1 shrink-0">
        <button
          v-if="hasChildren"
          type="button"
          class="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          @click="expanded = !expanded"
        >
          <ChevronDown v-if="expanded" class="w-3 h-3" />
          <ChevronRight v-else class="w-3 h-3" />
        </button>
      </div>
    </div>
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p
      class="text-xs text-foreground/70 leading-relaxed mt-0.5"
      :data-rule-context="entry.module_id"
      v-html="
        renderContent(entry.definition, {
          acronymPopups: appSettings.acronymPopups,
        })
      "
    />
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p
      v-if="entry.notes"
      class="text-xs text-muted-foreground italic mt-0.5"
      :data-rule-context="entry.module_id"
      v-html="
        renderContent(entry.notes, {
          acronymPopups: appSettings.acronymPopups,
        })
      "
    />
    <div
      v-if="activeRuleRefs(entry).length"
      class="mt-1 flex flex-wrap gap-1.5 items-center"
      :data-rule-context="entry.module_id"
    >
      <template v-for="ref in activeRuleRefs(entry)" :key="ref">
        <a
          v-if="ref.includes('-')"
          :data-rule-range="ref"
          class="ml-2 font-mono text-xs text-primary underline decoration-dotted hover:text-primary/80 transition-colors cursor-pointer"
          >{{ ref }}</a
        >
        <a
          v-else
          :data-rule-number="ref"
          class="ml-2 font-mono text-xs text-primary underline decoration-dotted hover:text-primary/80 transition-colors cursor-pointer"
          >{{ ref }}</a
        >
      </template>
    </div>
    <div v-if="entry.relations?.see_also?.length" class="mt-1 flex flex-wrap gap-1.5 items-center">
      <span class="ml-2 text-xs text-muted-foreground">See also:</span>
      <button
        v-for="term in entry.relations.see_also"
        :key="term"
        type="button"
        class="text-xs text-primary underline decoration-dotted hover:text-primary/80 italic transition-colors cursor-pointer"
        @click="emit('seeAlsoClick', term)"
      >
        {{ term }}
      </button>
    </div>

    <!-- Expanded children -->
    <template v-if="expanded && hasChildren">
      <IndexEntryResult
        v-for="child in children"
        :key="child.id"
        :entry="child"
        :depth="depth + 1"
        @see-also-click="emit('seeAlsoClick', $event)"
      />
    </template>
  </div>

  <EditIndexEntryDialog
    :open="editDialogOpen"
    :entry="entry"
    @update:open="editDialogOpen = $event"
  />
</template>
