<script setup lang="ts">
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
import type { Rule, IndexEntry } from '@/types/domain'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { renderContent } from '@/lib/renderContent'

interface Props {
  rules: Rule[]
  indexEntries: IndexEntry[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ selectRule: [rule: Rule] }>()

const query = ref('')
const open = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const expandedNotes = ref<Set<string>>(new Set())

const DEFAULT_CAP = 8

onClickOutside(containerRef, () => {
  open.value = false
})

const showAllRules = ref(false)
const showAllEntries = ref(false)

function rank(field: string, q: string): number {
  const f = field.toLowerCase()
  if (f === q) return 0
  if (f.startsWith(q)) return 1
  if (f.includes(q)) return 2
  return 3
}

interface RuleResult {
  rule: Rule
  rank: number
}

interface EntryResult {
  entry: IndexEntry
  rank: number
}

const entriesById = computed(() => {
  const m = new Map<string, IndexEntry>()
  for (const e of props.indexEntries) m.set(e.id, e)
  return m
})

const ruleResults = computed((): RuleResult[] => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []

  const results: RuleResult[] = []
  for (const rule of props.rules) {
    const rn = rank(rule.number, q)
    const rt = rank(rule.title, q)
    const best = Math.min(rn, rt)
    if (best < 3) {
      results.push({ rule, rank: best })
    }
  }
  results.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.rule.number.localeCompare(b.rule.number)
  })
  return results
})

const entryResults = computed((): EntryResult[] => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []

  const results: EntryResult[] = []
  for (const entry of props.indexEntries) {
    const r = rank(entry.term, q)
    if (r < 3) {
      results.push({ entry, rank: r })
    }
  }
  results.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.entry.term.localeCompare(b.entry.term)
  })
  return results
})

const visibleRules = computed(() =>
  showAllRules.value ? ruleResults.value : ruleResults.value.slice(0, DEFAULT_CAP),
)
const hiddenRulesCount = computed(() => Math.max(0, ruleResults.value.length - DEFAULT_CAP))

const visibleEntries = computed(() =>
  showAllEntries.value ? entryResults.value : entryResults.value.slice(0, DEFAULT_CAP),
)
const hiddenEntriesCount = computed(() => Math.max(0, entryResults.value.length - DEFAULT_CAP))

const hasResults = computed(
  () => ruleResults.value.length > 0 || entryResults.value.length > 0,
)

const showDropdown = computed(() => open.value && query.value.trim().length > 0)

function onInput() {
  open.value = true
  showAllRules.value = false
  showAllEntries.value = false
  expandedNotes.value = new Set()
}

function toggleNotes(id: string) {
  const s = new Set(expandedNotes.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedNotes.value = s
}

function onFocus() {
  if (query.value.trim()) open.value = true
}

function onEscape() {
  open.value = false
  ;(document.activeElement as HTMLElement | null)?.blur()
}

function handleSelectRule(rule: Rule) {
  emit('selectRule', rule)
  query.value = ''
  open.value = false
}
</script>

<template>
  <div ref="containerRef" class="relative w-full max-w-sm">
    <!-- Search input -->
    <div class="relative">
      <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      <Input
        v-model="query"
        placeholder="Search rules & index…"
        class="h-8 text-xs pl-8"
        @input="onInput"
        @focus="onFocus"
        @keydown="(e: KeyboardEvent) => e.key === 'Escape' && onEscape()"
      />
    </div>

    <!-- Dropdown -->
    <div
      v-if="showDropdown"
      :class="cn(
        'absolute top-full left-0 right-0 mt-1 z-50',
        'bg-popover border border-border rounded-md shadow-lg',
        'max-h-[420px] overflow-y-auto',
      )"
    >
      <template v-if="hasResults">
        <!-- Index entries group (first) -->
        <template v-if="visibleEntries.length > 0">
          <div class="px-2 pt-2 pb-1">
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Index
            </p>
          </div>
          <div
            v-for="{ entry } in visibleEntries"
            :key="entry.id"
            class="mx-1 mb-1 px-2 py-1.5 rounded"
          >
            <!-- Line 1: term + rule refs -->
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span v-if="entry.parent_id" class="text-xs text-muted-foreground">
                {{ entriesById.get(entry.parent_id)?.term }} ›
              </span>
              <button
                v-if="entry.notes"
                type="button"
                class="flex items-center gap-0.5 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                @click="toggleNotes(entry.id)"
              >
                <ChevronDown v-if="expandedNotes.has(entry.id)" class="w-3 h-3 shrink-0" />
                <ChevronRight v-else class="w-3 h-3 shrink-0" />
                {{ entry.term }}
              </button>
              <span v-else class="text-xs font-semibold text-foreground">{{ entry.term }}</span>

              <template v-if="entry.relations?.rule_refs?.length">
                <a
                  v-for="ref in entry.relations.rule_refs"
                  :key="ref"
                  :data-rule-number="ref"
                  class="font-mono text-xs text-primary underline decoration-dotted hover:text-primary/80 transition-colors cursor-pointer"
                >{{ ref }}</a>
              </template>
            </div>

            <!-- Line 2: definition (always) -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p
              class="text-foreground/70 text-xs leading-relaxed mt-0.5"
              v-html="renderContent(entry.definition)"
            />

            <!-- Line 3: see also (always) -->
            <div
              v-if="entry.relations?.see_also?.length"
              class="flex flex-wrap gap-1.5 items-center mt-0.5"
            >
              <span class="text-xs text-muted-foreground">See also:</span>
              <span
                v-for="term in entry.relations.see_also"
                :key="term"
                class="text-xs text-foreground/60 italic"
              >{{ term }}</span>
            </div>

            <!-- Notes: expandable -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p
              v-if="entry.notes && expandedNotes.has(entry.id)"
              class="text-muted-foreground text-xs italic mt-0.5"
              v-html="renderContent(entry.notes)"
            />
          </div>

          <button
            v-if="hiddenEntriesCount > 0 && !showAllEntries"
            class="w-full px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground text-left transition-colors"
            @click="showAllEntries = true"
          >
            {{ hiddenEntriesCount }} more…
          </button>
        </template>

        <!-- Divider between groups -->
        <div
          v-if="visibleEntries.length > 0 && visibleRules.length > 0"
          class="border-t border-border/50 my-1"
        />

        <!-- Rules group (second) -->
        <template v-if="visibleRules.length > 0">
          <div class="px-2 pt-2 pb-1">
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
              Rules
            </p>
          </div>
          <div
            v-for="{ rule } in visibleRules"
            :key="rule.id"
            class="px-2 py-1.5 mx-1 mb-0.5 rounded cursor-pointer hover:bg-accent flex items-baseline gap-2"
            @click="handleSelectRule(rule)"
          >
            <span :data-rule-number="rule.number" class="text-primary font-mono text-xs font-semibold shrink-0">{{ rule.number }}</span>
            <span class="text-foreground text-xs truncate">{{ rule.title }}</span>
          </div>
          <button
            v-if="hiddenRulesCount > 0 && !showAllRules"
            class="w-full px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground text-left transition-colors"
            @click="showAllRules = true"
          >
            {{ hiddenRulesCount }} more…
          </button>
        </template>
      </template>

      <!-- No results -->
      <div v-else class="px-3 py-4 text-xs text-muted-foreground text-center">
        No results for "{{ query.trim() }}"
      </div>

      <div class="h-1" />
    </div>
  </div>
</template>
