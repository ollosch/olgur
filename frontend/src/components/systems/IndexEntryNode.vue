<script setup lang="ts">
import { computed } from 'vue'
import type { IndexEntry } from '@/types/domain'
import { ChevronDown, ChevronRight } from 'lucide-vue-next'
import { renderContent } from '@/lib/renderContent'
import { useAppSettingsStore } from '@/stores/appSettings'

interface Props {
  entry: IndexEntry
  childrenByParent: Map<string | null, IndexEntry[]>
  expandedIds: Set<string>
  depth: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ toggle: [id: string] }>()

const appSettings = useAppSettingsStore()

const children = computed((): IndexEntry[] => props.childrenByParent.get(props.entry.id) ?? [])
const hasChildren = computed(() => children.value.length > 0)
const expanded = computed(() => props.expandedIds.has(props.entry.id))
</script>

<template>
  <div :style="{ paddingLeft: `${depth * 12}px` }" class="py-1.5 border-b border-border/50 last:border-0">
    <!-- Term -->
    <div class="flex items-baseline gap-1">
      <button
        v-if="hasChildren"
        type="button"
        class="flex items-center gap-0.5 text-xs font-semibold text-foreground hover:text-primary transition-colors text-left"
        @click="emit('toggle', entry.id)"
      >
        <ChevronDown v-if="expanded" class="w-3 h-3 shrink-0 mt-0.5" />
        <ChevronRight v-else class="w-3 h-3 shrink-0 mt-0.5" />
        {{ entry.term }}
      </button>
      <span v-else class="text-xs font-semibold text-foreground">{{ entry.term }}</span>
    </div>

    <!-- Definition -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p
      class="text-xs text-foreground/70 leading-relaxed mt-0.5"
      v-html="renderContent(entry.definition, { acronymPopups: appSettings.acronymPopups })"
    />

    <!-- Notes -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <p
      v-if="entry.notes"
      class="text-xs text-muted-foreground italic mt-0.5"
      v-html="renderContent(entry.notes, { acronymPopups: appSettings.acronymPopups })"
    />

    <!-- rule_refs -->
    <div v-if="entry.relations?.rule_refs?.length" class="mt-1 flex flex-wrap gap-1.5 items-center">
      <a
        v-for="ref in entry.relations.rule_refs"
        :key="ref"
        :data-rule-number="ref"
        class="ml-2 font-mono text-xs text-primary underline decoration-dotted hover:text-primary/80 transition-colors cursor-pointer"
      >{{ ref }}</a>
    </div>

    <!-- see_also -->
    <div v-if="entry.relations?.see_also?.length" class="mt-1 flex flex-wrap gap-1.5 items-center">
      <span class="ml-2 text-xs text-muted-foreground">See also:</span>
      <span
        v-for="term in entry.relations.see_also"
        :key="term"
        class="text-xs text-foreground/60 italic"
      >{{ term }}</span>
    </div>

    <!-- Expanded children (recursive) -->
    <template v-if="expanded && hasChildren">
      <IndexEntryNode
        v-for="child in children"
        :key="child.id"
        :entry="child"
        :children-by-parent="childrenByParent"
        :expanded-ids="expandedIds"
        :depth="depth + 1"
        @toggle="emit('toggle', $event)"
      />
    </template>
  </div>
</template>
