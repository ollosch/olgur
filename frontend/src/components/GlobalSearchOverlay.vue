<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronRight, Search } from 'lucide-vue-next'
import { useShortcutStore } from '@/stores/shortcut'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { useSystemNavStore } from '@/stores/systemNav'
import { useAppSettingsStore } from '@/stores/appSettings'
import { renderContent } from '@/lib/renderContent'
import { rankMatch } from '@/lib/utils'
import type { Rule, IndexEntry } from '@/types/domain'

const DEFAULT_CAP = 10
const shortcutStore = useShortcutStore()
const contentStore = useContentStore()
const systemStore = useSystemStore()
const navStore = useSystemNavStore()
const appSettings = useAppSettingsStore()

// Persistent state — survives open/close cycles
const query = ref('')
const showAllRules = ref(false)
const showAllEntries = ref(false)
const expandedNotes = ref<Set<string>>(new Set())

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

const activeModuleIds = computed((): string[] | null => {
  const ids = systemStore.membership?.config?.active_module_ids
  return ids ?? null
})

const searchableModules = computed(() => {
  const ids = activeModuleIds.value
  if (!ids) return systemStore.modules
  return systemStore.modules.filter((m) => m.is_core || ids.includes(m.id))
})

const allRules = computed((): Rule[] =>
  searchableModules.value.flatMap((m) => contentStore.rulesByModule[m.id] ?? []),
)

const allEntries = computed((): IndexEntry[] =>
  searchableModules.value.flatMap((m) => contentStore.indexEntriesByModule[m.id] ?? []),
)

const entriesById = computed((): Map<string, IndexEntry> => {
  const m = new Map<string, IndexEntry>()
  for (const e of allEntries.value) m.set(e.id, e)
  return m
})

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
  for (const entry of allEntries.value) {
    const r = rankMatch(entry.term, q)
    if (r < 3) results.push({ entry, rank: r })
  }
  results.sort((a, b) => {
    const aNested = a.entry.parent_id !== null ? 1 : 0
    const bNested = b.entry.parent_id !== null ? 1 : 0
    if (aNested !== bNested) return aNested - bNested
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.entry.term.localeCompare(b.entry.term)
  })
  return results
})

const ruleResults = computed((): RuleResult[] => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const results: RuleResult[] = []
  for (const rule of allRules.value) {
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
  expandedNotes.value = new Set()
}

function toggleNotes(id: string): void {
  const s = new Set(expandedNotes.value)
  if (s.has(id)) {
    s.delete(id)
  } else {
    s.add(id)
  }
  expandedNotes.value = s
}

function selectRule(rule: Rule): void {
  navStore.navigate({ view: 'rule', ruleId: rule.id })
  shortcutStore.overlayOpen = false
}

function selectRuleByNumber(number: string): void {
  const rule = allRules.value.find((r) => r.number === number)
  if (rule) selectRule(rule)
}
</script>

<template>
  <Dialog v-model:open="shortcutStore.overlayOpen">
    <DialogContent
      :show-close-button="false"
      class="top-16 translate-y-0 max-w-2xl p-0 gap-0 overflow-hidden flex flex-col"
    >
      <!-- Search input -->
      <div class="flex items-center gap-2 border-b border-border px-4 py-3 shrink-0">
        <Search class="w-4 h-4 text-muted-foreground shrink-0" />
        <Input
          ref="inputRef"
          v-model="query"
          placeholder="Search rules &amp; index…"
          class="border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm h-8 px-0"
          @input="onQueryInput"
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
              v-for="{ entry } in visibleEntries"
              :key="entry.id"
              class="mx-2 px-2 py-1.5 rounded transition-colors"
            >
              <!-- Term line -->
              <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span v-if="entry.parent_id" class="text-xs text-muted-foreground">
                  {{ entriesById.get(entry.parent_id)?.term }} ›
                </span>
                <button
                  v-if="entry.notes"
                  type="button"
                  class="flex items-center gap-0.5 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                  @click.stop="toggleNotes(entry.id)"
                >
                  <ChevronDown v-if="expandedNotes.has(entry.id)" class="w-3 h-3 shrink-0" />
                  <ChevronRight v-else class="w-3 h-3 shrink-0" />
                  {{ entry.term }}
                </button>
                <span v-else class="text-xs font-semibold text-foreground">{{ entry.term }}</span>

                <template v-if="entry.relations?.rule_refs?.length">
                  <button
                    v-for="ruleRef in entry.relations.rule_refs"
                    :key="ruleRef"
                    type="button"
                    class="font-mono text-xs text-primary underline decoration-dotted hover:text-primary/80 transition-colors cursor-pointer"
                    @click.stop="selectRuleByNumber(ruleRef)"
                  >{{ ruleRef }}</button>
                </template>
              </div>

              <!-- Definition -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <p
                class="text-foreground/70 text-xs leading-relaxed mt-0.5"
                v-html="renderContent(entry.definition, { acronymPopups: appSettings.acronymPopups })"
              />

              <!-- See also -->
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

              <!-- Notes (expandable) -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <p
                v-if="entry.notes && expandedNotes.has(entry.id)"
                class="text-muted-foreground text-xs italic mt-0.5"
                v-html="renderContent(entry.notes, { acronymPopups: appSettings.acronymPopups })"
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
              <span class="font-mono text-xs text-primary font-semibold shrink-0">{{ rule.number }}</span>
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
