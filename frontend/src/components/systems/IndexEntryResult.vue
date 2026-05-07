<script setup lang="ts">
import { ref, computed } from 'vue'
import type { IndexEntry } from '@/types/domain'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { renderContent } from '@/lib/renderContent'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useContentStore } from '@/stores/content'

interface Props {
  entry: IndexEntry
  depth?: number
}

const props = withDefaults(defineProps<Props>(), { depth: 0 })
const emit = defineEmits<{ seeAlsoClick: [term: string] }>()

const appSettings = useAppSettingsStore()
const contentStore = useContentStore()

const expanded = ref(false)

const children = computed((): IndexEntry[] =>
  (contentStore.indexEntriesByParent.get(props.entry.id) ?? []).filter((c) =>
    contentStore.visibleIndexEntryIds.has(c.id),
  ),
)
const hasChildren = computed(() => children.value.length > 0)

function activeRuleRefs(entry: IndexEntry): string[] {
  return (entry.relations?.rule_refs ?? []).filter((r) => contentStore.rulesByNumber.has(r))
}
</script>

<template>
  <div :style="depth > 0 ? { paddingLeft: `${depth * 12}px` } : {}" class="py-2 border-b border-border/50 last:border-0">
    <!-- Term line -->
    <div class="flex items-baseline justify-between gap-2">
      <p class="text-xs font-semibold text-foreground">
        <span v-if="depth === 0 && entry.parent_id" class="text-xs text-muted-foreground">
          {{ contentStore.indexEntriesById.get(entry.parent_id)?.term }} ›
        </span>{{ entry.term }}
      </p>
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
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p
      class="text-xs text-foreground/70 leading-relaxed mt-0.5"
      v-html="renderContent(entry.definition, { acronymPopups: appSettings.acronymPopups })"
    />
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p
      v-if="entry.notes"
      class="text-xs text-muted-foreground italic mt-0.5"
      v-html="renderContent(entry.notes, { acronymPopups: appSettings.acronymPopups })"
    />
    <div v-if="activeRuleRefs(entry).length" class="mt-1 flex flex-wrap gap-1.5 items-center">
      <a
        v-for="ref in activeRuleRefs(entry)"
        :key="ref"
        :data-rule-number="ref"
        class="ml-2 font-mono text-xs text-primary underline decoration-dotted hover:text-primary/80 transition-colors cursor-pointer"
      >{{ ref }}</a>
    </div>
    <div v-if="entry.relations?.see_also?.length" class="mt-1 flex flex-wrap gap-1.5 items-center">
      <span class="ml-2 text-xs text-muted-foreground">See also:</span>
      <button
        v-for="term in entry.relations.see_also"
        :key="term"
        type="button"
        class="text-xs text-primary underline decoration-dotted hover:text-primary/80 italic transition-colors cursor-pointer"
        @click="emit('seeAlsoClick', term)"
      >{{ term }}</button>
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
</template>
