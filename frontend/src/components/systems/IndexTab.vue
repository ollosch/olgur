<script setup lang="ts">
import { ref, computed } from 'vue'
import type { IndexEntry, Rule } from '@/types/domain'
import { Input } from '@/components/ui/input'
import { renderContent } from '@/lib/renderContent'
import { rankMatch } from '@/lib/utils'
import { useAppSettingsStore } from '@/stores/appSettings'

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

const search = ref('')
const activeLetter = ref<string | null>(null)

const availableLetters = computed(() => {
  const set = new Set<string>()
  for (const e of props.entries) {
    const first = e.term.charAt(0).toUpperCase()
    if (first) set.add(first)
  }
  return [...set].sort()
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()

  if (q) {
    return props.entries
      .filter((e) => e.term.toLowerCase().includes(q) || e.definition.toLowerCase().includes(q))
      .sort((a, b) => rankMatch(a.term, q) - rankMatch(b.term, q))
  }

  if (activeLetter.value) {
    return props.entries.filter(
      (e) => e.term.charAt(0).toUpperCase() === activeLetter.value,
    )
  }

  return []
})

function toggleLetter(letter: string) {
  activeLetter.value = activeLetter.value === letter ? null : letter
}

function onSearch() {
  activeLetter.value = null
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

    <!-- Results: document-level delegation handles all rule_refs links -->
    <div class="flex-1 overflow-y-auto px-3 pb-3">
      <div v-if="filtered.length === 0" class="text-xs text-muted-foreground py-4 text-center">
        <span v-if="search.trim() || activeLetter">No results.</span>
        <span v-else>Select a letter or search above.</span>
      </div>

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
        <p
          class="text-xs text-foreground/70 leading-relaxed mt-0.5"
          v-html="renderContent(entry.definition, { acronymPopups: appSettings.acronymPopups })"
        />
        <p
          v-if="entry.notes"
          class="text-xs text-muted-foreground italic mt-0.5"
          v-html="renderContent(entry.notes, { acronymPopups: appSettings.acronymPopups })"
        />

        <!-- rule_refs: data attribute only, delegation handles hover + click -->
        <div v-if="entry.relations?.rule_refs?.length" class="mt-1 flex flex-wrap gap-1.5 items-center">
          <a
            v-for="ref in entry.relations.rule_refs"
            :key="ref"
            :data-rule-number="ref"
            class=" ml-2 font-mono text-xs text-primary underline decoration-dotted hover:text-primary/80 transition-colors cursor-pointer"
          >{{ ref }}</a>
        </div>

        <!-- see_also -->
        <div v-if="entry.relations?.see_also?.length" class="mt-1 flex flex-wrap gap-1.5 items-center">
          <span class=" ml-2 text-xs text-muted-foreground">See also:</span>
          <span
            v-for="term in entry.relations.see_also"
            :key="term"
            class="text-xs text-foreground/60 italic"
          >{{ term }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
