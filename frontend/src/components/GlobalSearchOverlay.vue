<script setup lang="ts">
import { ref, computed, watch, nextTick, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Search } from 'lucide-vue-next'
import { useShortcutStore } from '@/stores/shortcut'
import { useContentStore } from '@/stores/content'
import { rankMatch, compareIndexEntries } from '@/lib/utils'
import type { Rule, IndexEntry } from '@/types/domain'
import IndexEntryNode from '@/components/systems/IndexEntryNode.vue'

const DEFAULT_CAP = 10
const shortcutStore = useShortcutStore()
const contentStore = useContentStore()
const router = useRouter()
const route = useRoute()

// Persistent state — survives open/close cycles
const query = ref('')
const showAllRules = ref(false)
const showAllEntries = ref(false)
const expandedEntryIds = reactive(new Set<string>())

const listRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const savedScrollTop = ref(0)

watch(
  () => shortcutStore.overlayOpen,
  async (open) => {
    if (open) {
      await nextTick()
      inputRef.value?.focus()
      if (listRef.value) {
        listRef.value.scrollTop = savedScrollTop.value
      }
    } else {
      savedScrollTop.value = listRef.value?.scrollTop ?? 0
    }
  },
)

// ── Data ────────────────────────────────────────────────────────────────────

// ── Ranking + search ─────────────────────────────────────────────────────────

interface RuleResult {
  rule: Rule
  rank: number
}

interface EntryResult {
  entry: IndexEntry
  rank: number
}

const entryResults = computed((): EntryResult[] => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const results: EntryResult[] = []
  const visibleIds = contentStore.visibleIndexEntryIds
  for (const entry of contentStore.allIndexEntries) {
    if (!visibleIds.has(entry.id)) continue
    const r = Math.min(rankMatch(entry.term, q), rankMatch(entry.definition, q))
    if (r < 3) results.push({ entry, rank: r })
  }
  results.sort((a, b) => compareIndexEntries(a.entry, b.entry, q))
  return results
})

const ruleResults = computed((): RuleResult[] => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const results: RuleResult[] = []
  for (const rule of contentStore.allRules) {
    const best = Math.min(rankMatch(rule.number, q), rankMatch(rule.title, q))
    if (best < 3) results.push({ rule, rank: best })
  }
  results.sort((a, b) => {
    const aNested = a.rule.parent_id !== null ? 1 : 0
    const bNested = b.rule.parent_id !== null ? 1 : 0
    if (aNested !== bNested) return aNested - bNested
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.rule.number.localeCompare(b.rule.number)
  })
  return results
})

const visibleEntries = computed((): EntryResult[] =>
  showAllEntries.value ? entryResults.value : entryResults.value.slice(0, DEFAULT_CAP),
)
const hiddenEntriesCount = computed((): number =>
  Math.max(0, entryResults.value.length - DEFAULT_CAP),
)

const visibleRules = computed((): RuleResult[] =>
  showAllRules.value ? ruleResults.value : ruleResults.value.slice(0, DEFAULT_CAP),
)
const hiddenRulesCount = computed((): number =>
  Math.max(0, ruleResults.value.length - DEFAULT_CAP),
)

const hasResults = computed(
  (): boolean => ruleResults.value.length > 0 || entryResults.value.length > 0,
)

// ── Actions ──────────────────────────────────────────────────────────────────

function onQueryInput(): void {
  showAllRules.value = false
  showAllEntries.value = false
  expandedEntryIds.clear()
}

function toggleEntryExpand(id: string): void {
  if (expandedEntryIds.has(id)) {
    expandedEntryIds.delete(id)
  } else {
    expandedEntryIds.add(id)
  }
}

function selectRule(rule: Rule): void {
  const systemId = route.params['systemId'] as string | undefined
  if (systemId) {
    router.push({ name: 'system-rule', params: { systemId, ruleId: rule.id } })
  }
  shortcutStore.overlayOpen = false
}

function selectRuleByNumber(number: string): void {
  const rule = contentStore.rulesByNumber.get(number)
  if (rule) selectRule(rule)
}

function handleEntryClick(e: MouseEvent): void {
  const anchor = (e.target as HTMLElement).closest('[data-rule-number]') as HTMLElement | null
  if (anchor?.dataset['ruleNumber']) {
    selectRuleByNumber(anchor.dataset['ruleNumber'])
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && ruleResults.value.length > 0) {
    e.preventDefault()
    if (ruleResults.value[0]) {
      selectRule(ruleResults.value[0].rule)
    }
  }
}
</script>

<template>
  <Dialog v-model:open="shortcutStore.overlayOpen">
    <DialogContent
      :show-close-button="false"
      class="top-16 translate-y-0 max-w-2xl p-0 gap-0 overflow-hidden flex flex-col"
    >
      <DialogTitle class="sr-only">Search</DialogTitle>
      <DialogDescription class="sr-only">Search rules and index entries</DialogDescription>
      <!-- Search input -->
      <div class="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
        <Search class="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          placeholder="Search rules &amp; index…"
          class="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          @input="onQueryInput"
          @keydown="onKeyDown"
        />
      </div>

      <!-- Results -->
      <div
        ref="listRef"
        class="overflow-y-auto max-h-[70vh] py-2"
      >
        <!-- Has results -->
        <template v-if="query.trim() && hasResults">
          <!-- Index group -->
          <template v-if="entryResults.length > 0">
            <div class="px-3 pt-1 pb-1">
              <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Index
              </p>
            </div>

            <div
              class="mx-2"
              @click="handleEntryClick"
            >
              <IndexEntryNode
                v-for="{ entry } in visibleEntries"
                :key="entry.id"
                :entry="entry"
                :children-by-parent="contentStore.indexEntriesByParent"
                :expanded-ids="expandedEntryIds"
                :depth="0"
                :entries-by-id="contentStore.indexEntriesById"
                :show-ancestors="true"
                @toggle="toggleEntryExpand"
              />
            </div>

            <button
              v-if="hiddenEntriesCount > 0 && !showAllEntries"
              class="w-full px-4 py-1.5 text-[11px] text-muted-foreground hover:text-foreground text-left transition-colors"
              @click="showAllEntries = true"
            >
              {{ hiddenEntriesCount }} more…
            </button>
          </template>

          <!-- Separator between groups -->
          <div
            v-if="entryResults.length > 0 && ruleResults.length > 0"
            class="border-t border-border/50 my-2"
          />

          <!-- Rules group -->
          <template v-if="ruleResults.length > 0">
            <div class="px-3 pt-1 pb-1">
              <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Rules
              </p>
            </div>

            <div
              v-for="{ rule } in visibleRules"
              :key="rule.id"
              class="mx-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent flex items-baseline gap-2 transition-colors"
              role="button"
              tabindex="0"
              @click="selectRule(rule)"
              @keydown.enter="selectRule(rule)"
            >
              <span :data-rule-number="rule.number" class="font-mono text-xs text-primary font-semibold shrink-0">{{ rule.number }}</span>
              <span class="text-foreground text-xs truncate">{{ rule.title }}</span>
            </div>

            <button
              v-if="hiddenRulesCount > 0 && !showAllRules"
              class="w-full px-4 py-1.5 text-[11px] text-muted-foreground hover:text-foreground text-left transition-colors"
              @click="showAllRules = true"
            >
              {{ hiddenRulesCount }} more…
            </button>
          </template>
        </template>

        <!-- No results -->
        <div
          v-else-if="query.trim() && !hasResults"
          class="px-4 py-8 text-xs text-muted-foreground text-center"
        >
          No results for "{{ query.trim() }}"
        </div>

        <!-- Empty state (no query) -->
        <div
          v-else
          class="px-4 py-8 text-xs text-muted-foreground text-center"
        >
          Type to search rules &amp; index entries…
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
