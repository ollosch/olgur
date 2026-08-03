<script setup lang="ts">
import { computed, ref } from 'vue'
import { useContentStore } from '@/stores/content'
import type { IndexEntry } from '@/types/domain'
import { rankMatchLower } from '@/lib/utils'

import { Input } from '@/components/ui/input'

interface Props {
  moduleId: string
  excludedIds?: Set<string>
  excludedTerms?: Set<string>
  rootOnly?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [entry: IndexEntry]
}>()

const contentStore = useContentStore()
const search = ref('')

const results = computed((): IndexEntry[] => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []

  const moduleEntries = contentStore.indexEntriesByModule[props.moduleId] ?? []

  return moduleEntries
    .filter(
      (e) =>
        (!props.rootOnly || e.parent_id === null) &&
        !props.excludedIds?.has(e.id) &&
        !props.excludedTerms?.has(e.term),
    )
    .map((e) => ({ entry: e, rank: rankMatchLower(e.term.toLowerCase(), q) }))
    .filter((x) => x.rank < 3)
    .sort((a, b) => a.rank - b.rank || a.entry.term.localeCompare(b.entry.term))
    .map((x) => x.entry)
})

function select(entry: IndexEntry): void {
  search.value = ''
  emit('select', entry)
}
</script>

<template>
  <div class="relative">
    <Input
      v-model="search"
      placeholder="Search by term…"
      autocomplete="off"
      @keydown.enter.prevent
    />
    <div
      v-if="search.trim()"
      class="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md"
    >
      <div v-if="results.length === 0" class="py-6 text-center text-sm text-muted-foreground">
        No matching entries
      </div>
      <button
        v-for="result in results"
        :key="result.id"
        type="button"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
        @click="select(result)"
      >
        <span class="text-foreground/80 min-w-0 truncate">{{ result.term }}</span>
      </button>
    </div>
  </div>
</template>
