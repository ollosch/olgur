<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Search } from '@lucide/vue'
import { useShortcutStore } from '@/stores/shortcut'
import { useContentStore } from '@/stores/content'
import { rankMatchLower, compareIndexEntries, rankRule } from '@/lib/utils'
import { renderContent } from '@/lib/renderContent'
import type { Rule, IndexEntry, GameDatum } from '@/types/domain'
import IndexEntryResult from '@/components/systems/IndexEntryResult.vue'
import { unitTypeLabel, unitNation } from '@/lib/unitUtils'
import { useUnitSelectionStore } from '@/stores/unitSelection'
import { useBottomPanelStore } from '@/stores/bottomPanel'

const DEFAULT_CAP = 10
const shortcutStore = useShortcutStore()
const contentStore = useContentStore()
const router = useRouter()
const route = useRoute()
const unitSelectionStore = useUnitSelectionStore()
const bottomPanelStore = useBottomPanelStore()

// Persistent state — survives open/close cycles
const query = ref('')
const showAllRules = ref(false)
const showAllEntries = ref(false)
const showAllGameData = ref(false)
const showAllUnits = ref(false)

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

interface GameDataResult {
  item: GameDatum
  rank: number
}

const entryResults = computed((): EntryResult[] => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const results: EntryResult[] = []
  const visibleIds = contentStore.visibleIndexEntryIds
  for (const entry of contentStore.allIndexEntries) {
    if (!visibleIds.has(entry.id)) continue
    const r = rankMatchLower(entry.term.toLowerCase(), q)
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
    const best = rankRule(rule, q)
    if (best < 6) results.push({ rule, rank: best })
  }
  results.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    const aNested = a.rule.parent_id !== null ? 1 : 0
    const bNested = b.rule.parent_id !== null ? 1 : 0
    if (aNested !== bNested) return aNested - bNested
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
const hiddenRulesCount = computed((): number => Math.max(0, ruleResults.value.length - DEFAULT_CAP))

const gameDataResults = computed((): GameDataResult[] => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const results: GameDataResult[] = []
  for (const item of contentStore.allGameData) {
    if (item.type !== 'sop' && item.type !== 'table') continue
    const r = rankMatchLower(item.name.toLowerCase(), q)
    if (r < 3) results.push({ item, rank: r })
  }
  results.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.item.name.localeCompare(b.item.name)
  })
  return results
})

const unitResults = computed((): GameDataResult[] => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  const results: GameDataResult[] = []
  for (const item of contentStore.allGameData) {
    if (item.type !== 'vehicle' && item.type !== 'ordnance') continue
    const r = rankMatchLower(item.name.toLowerCase(), q)
    if (r < 3) results.push({ item, rank: r })
  }
  results.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    return a.item.name.localeCompare(b.item.name)
  })
  return results
})

const visibleGameData = computed((): GameDataResult[] =>
  showAllGameData.value ? gameDataResults.value : gameDataResults.value.slice(0, DEFAULT_CAP),
)
const hiddenGameDataCount = computed((): number =>
  Math.max(0, gameDataResults.value.length - DEFAULT_CAP),
)

const visibleUnits = computed((): GameDataResult[] =>
  showAllUnits.value ? unitResults.value : unitResults.value.slice(0, DEFAULT_CAP),
)
const hiddenUnitsCount = computed((): number => Math.max(0, unitResults.value.length - DEFAULT_CAP))

const hasResults = computed(
  (): boolean =>
    ruleResults.value.length > 0 ||
    entryResults.value.length > 0 ||
    gameDataResults.value.length > 0 ||
    unitResults.value.length > 0,
)

function onQueryInput(): void {
  showAllRules.value = false
  showAllEntries.value = false
  showAllGameData.value = false
  showAllUnits.value = false
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

function selectGameDatum(item: GameDatum): void {
  const systemId = route.params['systemId'] as string | undefined
  if (systemId) {
    router.push({ name: 'system-game-datum', params: { systemId, gameDatumId: item.id } })
  }
  shortcutStore.overlayOpen = false
}

function selectUnit(item: GameDatum): void {
  unitSelectionStore.selectUnit(item)
  bottomPanelStore.open()
  bottomPanelStore.setActiveTab('unit_browser')
  shortcutStore.overlayOpen = false
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
      <div ref="listRef" class="overflow-y-auto max-h-[70vh] py-2">
        <!-- Has results -->
        <template v-if="query.trim() && hasResults">
          <!-- Index group -->
          <template v-if="entryResults.length > 0">
            <div class="px-3 pt-1 pb-1">
              <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Index
              </p>
            </div>

            <div class="mx-2" @click="handleEntryClick">
              <IndexEntryResult
                v-for="{ entry } in visibleEntries"
                :key="entry.id"
                :entry="entry"
                @see-also-click="
                  (t) => {
                    query = t
                  }
                "
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
              <span
                :data-rule-number="rule.number"
                class="font-mono text-xs text-primary font-semibold shrink-0"
                >{{ rule.number }}</span
              >
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span class="text-foreground text-xs truncate" v-html="renderContent(rule.title)" />
            </div>

            <button
              v-if="hiddenRulesCount > 0 && !showAllRules"
              class="w-full px-4 py-1.5 text-[11px] text-muted-foreground hover:text-foreground text-left transition-colors"
              @click="showAllRules = true"
            >
              {{ hiddenRulesCount }} more…
            </button>
          </template>

          <!-- Separator between groups -->
          <div
            v-if="ruleResults.length > 0 && gameDataResults.length > 0"
            class="border-t border-border/50 my-2"
          />

          <!-- Game Data group -->
          <template v-if="gameDataResults.length > 0">
            <div class="px-3 pt-1 pb-1">
              <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Game Data
              </p>
            </div>

            <div
              v-for="{ item } in visibleGameData"
              :key="item.id"
              class="mx-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent flex items-center gap-2 transition-colors"
              role="button"
              tabindex="0"
              @click="selectGameDatum(item)"
              @keydown.enter="selectGameDatum(item)"
            >
              <span
                class="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0"
                >{{ item.type }}</span
              >
              <span class="text-foreground text-xs truncate">{{ item.name }}</span>
            </div>

            <button
              v-if="hiddenGameDataCount > 0 && !showAllGameData"
              class="w-full px-4 py-1.5 text-[11px] text-muted-foreground hover:text-foreground text-left transition-colors"
              @click="showAllGameData = true"
            >
              {{ hiddenGameDataCount }} more…
            </button>
          </template>

          <!-- Separator between groups -->
          <div
            v-if="
              (gameDataResults.length > 0 || ruleResults.length > 0 || entryResults.length > 0) &&
              unitResults.length > 0
            "
            class="border-t border-border/50 my-2"
          />

          <!-- Units group (vehicles + ordnance) -->
          <template v-if="unitResults.length > 0">
            <div class="px-3 pt-1 pb-1">
              <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Units
              </p>
            </div>

            <div
              v-for="{ item } in visibleUnits"
              :key="item.id"
              class="mx-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent flex items-center gap-2 transition-colors"
              role="button"
              tabindex="0"
              @click="selectUnit(item)"
              @keydown.enter="selectUnit(item)"
            >
              <span
                class="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0"
                >{{ unitTypeLabel(item) }}</span
              >
              <span class="text-foreground text-xs truncate flex-1">{{ item.name }}</span>
              <span v-if="unitNation(item)" class="text-[10px] text-muted-foreground shrink-0">{{
                unitNation(item)
              }}</span>
            </div>

            <button
              v-if="hiddenUnitsCount > 0 && !showAllUnits"
              class="w-full px-4 py-1.5 text-[11px] text-muted-foreground hover:text-foreground text-left transition-colors"
              @click="showAllUnits = true"
            >
              {{ hiddenUnitsCount }} more…
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
        <div v-else class="px-4 py-8 text-xs text-muted-foreground text-center">
          Type to search rules &amp; index entries…
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
