<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import type { IndexEntry, Rule } from '@/types/domain'
import { Input } from '@/components/ui/input'
import { renderContent } from '@/lib/renderContent'
import { compareIndexEntries } from '@/lib/utils'
import { useAppSettingsStore } from '@/stores/appSettings'
import IndexEntryNode from '@/components/systems/IndexEntryNode.vue'

interface Props {
  entries: IndexEntry[]
  rulesByNumber: Map<string, Rule>
}

const props = defineProps<Props>()
const emit = defineEmits<{ selectRule: [rule: Rule] }>()

const appSettings = useAppSettingsStore()

const entriesById = computed(() => {
  const map = new Map<string, IndexEntry>()
  for (const e of props.entries) map.set(e.id, e)
  return map
})

/** O(1) children lookup for hierarchical display */
const childrenByParent = computed((): Map<string | null, IndexEntry[]> => {
  const map = new Map<string | null, IndexEntry[]>()
  for (const e of props.entries) {
    const key = e.parent_id
    const bucket = map.get(key)
    if (bucket) {
      bucket.push(e)
    } else {
      map.set(key, [e])
    }
  }
  return map
})

const search = ref('')
const activeLetter = ref<string | null>(null)
/** Tracks which entries are expanded to show their children */
const expandedIds = reactive(new Set<string>())

const availableLetters = computed(() => {
  const set = new Set<string>()
  for (const e of props.entries) {
    if (e.parent_id !== null) continue // letters only for top-level terms
    const first = e.term.charAt(0).toUpperCase()
    if (first) set.add(first)
  }
  return [...set].sort()
})

/** Entries to display at the top level based on active filter */
const filtered = computed((): IndexEntry[] => {
  const q = search.value.trim().toLowerCase()

  if (q) {
    // Flat search — show all matching entries regardless of hierarchy
    return props.entries
      .filter((e) => e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q))
      .sort((a, b) => compareIndexEntries(a, b, q))
  }

  if (activeLetter.value) {
    // Show only top-level entries for the active letter
    return props.entries.filter(
      (e) => e.parent_id === null && e.term.charAt(0).toUpperCase() === activeLetter.value,
    )
  }

  return []
})

const isSearchMode = computed(() => !!search.value.trim())

function toggleLetter(letter: string): void {
  activeLetter.value = activeLetter.value === letter ? null : letter
}

function onSearch(): void {
  activeLetter.value = null
  expandedIds.clear()
}

function toggleExpand(id: string): void {
  if (expandedIds.has(id)) {
    expandedIds.delete(id)
  } else {
    expandedIds.add(id)
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Search -->
    <div class="px-3 pt-3 pb-2 shrink-0">
      <Input
        v-model="search"
        placeholder="Search index…"
        class="h-8 text-xs"
        @input="onSearch"
      />
    </div>

    <!-- Letter filter (shown when search is empty) -->
    <div v-if="!search.trim()" class="px-3 pb-2 flex flex-wrap gap-1 shrink-0">
      <button
        v-for="letter in availableLetters"
        :key="letter"
        :class="[
          'w-6 h-6 text-xs rounded font-mono transition-colors',
          activeLetter === letter
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/50 hover:bg-muted text-foreground/70',
        ]"
        @click="toggleLetter(letter)"
      >
        {{ letter }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-3 pb-3">
      <div v-if="filtered.length === 0" class="text-xs text-muted-foreground py-4 text-center">
        <span v-if="search.trim() || activeLetter">No results.</span>
        <span v-else>Select a letter or search above.</span>
      </div>

      <!-- Flat search mode: show matches as-is (with parent prefix) -->
      <template v-if="isSearchMode">
        <div
          v-for="entry in filtered"
          :key="entry.id"
          class="py-2 border-b border-border/50 last:border-0"
        >
          <p class="text-xs font-semibold text-foreground">
            <span v-if="entry.parent_id" class="text-xs text-muted-foreground">
              {{ entriesById.get(entry.parent_id)?.term }} ›
            </span>{{ entry.term }}
          </p>
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
          <div v-if="entry.relations?.rule_refs?.length" class="mt-1 flex flex-wrap gap-1.5 items-center">
            <a
              v-for="ref in entry.relations.rule_refs"
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
              @click="search = term; activeLetter = null"
            >{{ term }}</button>
          </div>
        </div>
      </template>

      <!-- Hierarchical mode: expandable tree via letter filter -->
      <template v-else>
        <IndexEntryNode
          v-for="entry in filtered"
          :key="entry.id"
          :entry="entry"
          :children-by-parent="childrenByParent"
          :expanded-ids="expandedIds"
          :depth="0"
          @toggle="toggleExpand"
        />
      </template>
    </div>
  </div>
</template>
