<script setup lang="ts">
import { ref, computed } from 'vue'
import { Input } from '@/components/ui/input'
import { compareIndexEntries, rankMatchLower } from '@/lib/utils'
import { useContentStore } from '@/stores/content'
import IndexEntryResult from '@/components/systems/IndexEntryResult.vue'

const contentStore = useContentStore()

const search = ref('')
const activeLetter = ref<string | null>(null)

const availableLetters = computed(() => {
  const set = new Set<string>()
  for (const e of contentStore.allIndexEntries) {
    if (e.parent_id !== null) continue // letters only for top-level terms
    if (!contentStore.visibleIndexEntryIds.has(e.id)) continue
    const first = e.term.charAt(0).toUpperCase()
    if (first) set.add(first)
  }
  return [...set].sort()
})

/** Entries to display at the top level based on active filter */
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const visibleIds = contentStore.visibleIndexEntryIds

  if (q) {
    // Flat search — term only, single-letter restricted to exact match
    return contentStore.allIndexEntries
      .filter((e) => visibleIds.has(e.id) && rankMatchLower(e.term.toLowerCase(), q) < 3)
      .sort((a, b) => compareIndexEntries(a, b, q))
  }

  if (activeLetter.value) {
    // Show only top-level entries for the active letter
    return contentStore.allIndexEntries.filter(
      (e) =>
        visibleIds.has(e.id) &&
        e.parent_id === null &&
        e.term.charAt(0).toUpperCase() === activeLetter.value,
    )
  }

  return []
})

function toggleLetter(letter: string): void {
  activeLetter.value = activeLetter.value === letter ? null : letter
}

function onSearch(): void {
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

    <div class="flex-1 overflow-y-auto px-3 pb-3">
      <div v-if="filtered.length === 0" class="text-xs text-muted-foreground py-4 text-center">
        <span v-if="search.trim() || activeLetter">No results.</span>
        <span v-else>Select a letter or search above.</span>
      </div>

      <!-- Flat search mode: show matches as-is (with parent prefix) -->
      <!-- Letter mode: show top-level entries starting with the selected letter -->
      <template v-if="filtered.length > 0">
        <IndexEntryResult
          v-for="entry in filtered"
          :key="entry.id"
          :entry="entry"
          @see-also-click="(t) => { search = t; activeLetter = null }"
        />
      </template>
    </div>
  </div>
</template>
