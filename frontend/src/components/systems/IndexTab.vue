<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { Input } from '@/components/ui/input'
import { compareIndexEntries, rankMatchLower, SEARCH_DEBOUNCE_MS } from '@/lib/utils'
import { useContentStore } from '@/stores/content'
import IndexEntryResult from '@/components/systems/IndexEntryResult.vue'

const contentStore = useContentStore()

const search = ref('')
const debouncedSearch = refDebounced(search, SEARCH_DEBOUNCE_MS)
const activeLetter = ref<string | null>(null)
const showAllRoots = ref(false)
const showNested = ref(false)

watch(search, () => {
  activeLetter.value = null
  showAllRoots.value = false
  showNested.value = false
})

const availableLetters = computed(() => {
  const set = new Set<string>()
  for (const e of contentStore.allIndexEntries) {
    if (e.parent_id !== null) continue
    if (!contentStore.visibleIndexEntryIds.has(e.id)) continue
    const first = e.term.charAt(0).toUpperCase()
    if (first) set.add(first)
  }
  return [...set].sort()
})

/** All matching entries in search mode */
const filtered = computed(() => {
  const q = debouncedSearch.value.trim().toLowerCase()
  const visibleIds = contentStore.visibleIndexEntryIds

  if (q) {
    return contentStore.allIndexEntries
      .filter((e) => visibleIds.has(e.id) && rankMatchLower(e.term.toLowerCase(), q) < 3)
      .sort((a, b) => compareIndexEntries(a, b, q))
  }

  if (activeLetter.value) {
    return contentStore.allIndexEntries.filter(
      (e) =>
        visibleIds.has(e.id) &&
        e.parent_id === null &&
        e.term.charAt(0).toUpperCase() === activeLetter.value,
    )
  }

  return []
})

const isSearchMode = computed(() => debouncedSearch.value.trim().length > 0)

/** Root-only subset (search mode) or full filtered list (letter mode) */
const rootResults = computed(() =>
  isSearchMode.value ? filtered.value.filter((e) => e.parent_id === null) : filtered.value,
)

/** Nested subset — only relevant in search mode */
const nestedResults = computed(() =>
  isSearchMode.value ? filtered.value.filter((e) => e.parent_id !== null) : [],
)

const RESULT_CAP = 50

const visibleRoots = computed(() =>
  showAllRoots.value ? rootResults.value : rootResults.value.slice(0, RESULT_CAP),
)

const hiddenRootsCount = computed(() =>
  showAllRoots.value ? 0 : Math.max(0, rootResults.value.length - RESULT_CAP),
)

const visibleNested = computed(() => (showNested.value ? nestedResults.value : []))

function toggleLetter(letter: string): void {
  activeLetter.value = activeLetter.value === letter ? null : letter
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Search -->
    <div class="px-3 pt-3 pb-2 shrink-0">
      <Input v-model="search" placeholder="Search index…" class="h-8 text-xs" />
    </div>

    <!-- Letter filter (shown when search is empty) -->
    <div v-if="!search.trim()" class="px-3 pb-2 flex flex-wrap gap-1 shrink-0">
      <button v-for="letter in availableLetters" :key="letter" :class="[
        'w-6 h-6 text-xs rounded font-mono transition-colors',
        activeLetter === letter
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/50 hover:bg-muted text-foreground/70',
      ]" @click="toggleLetter(letter)">
        {{ letter }}
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-3 pb-3">
      <div v-if="visibleRoots.length === 0 && visibleNested.length === 0 && nestedResults.length === 0" class="text-xs text-muted-foreground py-4 text-center">
        <span v-if="search.trim() || activeLetter">No results.</span>
        <span v-else>Select a letter or search above.</span>
      </div>

      <!-- Root results -->
      <IndexEntryResult v-for="entry in visibleRoots" :key="entry.id" :entry="entry"
        @see-also-click="(t) => { search = t; activeLetter = null }" />

      <!-- Show remaining root results -->
      <button
        v-if="hiddenRootsCount > 0"
        class="w-full px-1 py-1.5 text-[11px] text-muted-foreground hover:text-foreground text-left transition-colors"
        @click="showAllRoots = true"
      >
        {{ hiddenRootsCount }} more…
      </button>

      <!-- Nested results (once expanded) -->
      <template v-if="visibleNested.length > 0">
        <div class="border-t border-border/50 my-2" />
        <IndexEntryResult v-for="entry in visibleNested" :key="entry.id" :entry="entry"
          @see-also-click="(t) => { search = t; activeLetter = null }" />
      </template>

      <!-- Show nested results button -->
      <button
        v-if="isSearchMode && nestedResults.length > 0 && !showNested"
        class="w-full px-1 py-1.5 text-[11px] text-muted-foreground hover:text-foreground text-left transition-colors"
        @click="showNested = true"
      >
        {{ nestedResults.length }} nested result{{ nestedResults.length === 1 ? '' : 's' }}…
      </button>
    </div>
  </div>
</template>
