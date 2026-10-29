<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { refDebounced } from '@vueuse/core'
import { ArrowLeft, GitCompare } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SEARCH_DEBOUNCE_MS, rankMatchLower } from '@/lib/utils'
import { unitTypeLabel, unitNation } from '@/lib/unitUtils'
import { useContentStore } from '@/stores/content'
import { useUnitBrowserStore } from '@/stores/unitBrowser'
import UnitDetailCard from '@/components/layout/UnitDetailCard.vue'
import type { GameDatum } from '@/types/domain'

const props = withDefaults(
  defineProps<{
    initialUnit?: GameDatum | null
    showCompareButton?: boolean
    mode?: 'full' | 'list-only' | 'detail-only'
    detailUnit?: GameDatum | null
  }>(),
  {
    initialUnit: null,
    showCompareButton: true,
    mode: 'full',
    detailUnit: null,
  },
)

const emit = defineEmits<{
  compare: [unit: GameDatum]
  select: [unit: GameDatum]
}>()

const contentStore = useContentStore()

// ── State ────────────────────────────────────────────────────────────────────
// Backed by a store (rather than local refs) so search/filters/selection
// survive the panel that hosts this component being closed and reopened.

const browserStore = useUnitBrowserStore()
const { search, activeLetter, typeFilter, nationFilter, selectedUnit } = storeToRefs(browserStore)
const debouncedSearch = refDebounced(search, SEARCH_DEBOUNCE_MS)

if (props.initialUnit) {
  selectedUnit.value = props.initialUnit
}

watch(
  () => props.initialUnit,
  (unit) => {
    if (unit) {
      selectedUnit.value = unit
    }
  },
)

watch(search, () => {
  activeLetter.value = null
})

// ── All units ─────────────────────────────────────────────────────────────────

const allUnits = computed((): GameDatum[] =>
  contentStore.allGameData.filter((d) => d.type === 'vehicle' || d.type === 'ordnance'),
)

// ── Available letter chips ────────────────────────────────────────────────────

const availableLetters = computed((): string[] => {
  const set = new Set<string>()
  for (const u of allUnits.value) {
    const first = u.name.charAt(0).toUpperCase()
    if (first) set.add(first)
  }
  return [...set].sort()
})

// ── Available nations ─────────────────────────────────────────────────────────

const availableNations = computed((): string[] => {
  const set = new Set<string>()
  for (const u of allUnits.value) {
    const n = unitNation(u)
    if (n) set.add(n)
  }
  return [...set].sort()
})

// ── Filtered results ──────────────────────────────────────────────────────────

const isFiltering = computed(
  (): boolean =>
    debouncedSearch.value.trim().length > 0 ||
    typeFilter.value !== 'all' ||
    nationFilter.value !== 'all',
)

const filteredUnits = computed((): GameDatum[] => {
  let items = allUnits.value

  // Type filter
  if (typeFilter.value !== 'all') {
    items = items.filter((u) => u.type === typeFilter.value)
  }

  // Nation filter
  if (nationFilter.value !== 'all') {
    items = items.filter((u) => unitNation(u) === nationFilter.value)
  }

  // Text search
  const q = debouncedSearch.value.trim().toLowerCase()
  if (q) {
    items = items
      .map((u) => ({ u, rank: rankMatchLower(u.name.toLowerCase(), q) }))
      .filter(({ rank }) => rank < 3)
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank
        return a.u.name.localeCompare(b.u.name)
      })
      .map(({ u }) => u)
  } else if (activeLetter.value) {
    items = items.filter((u) => u.name.charAt(0).toUpperCase() === activeLetter.value)
    items = [...items].sort((a, b) => a.name.localeCompare(b.name))
  } else {
    // No search, no letter — only type/nation filters active: sort alphabetically
    items = [...items].sort((a, b) => a.name.localeCompare(b.name))
  }

  return items
})

// When filtering without a letter, show all results (already filtered by type/nation)
const showList = computed((): boolean => isFiltering.value || activeLetter.value !== null)

function toggleLetter(letter: string): void {
  activeLetter.value = activeLetter.value === letter ? null : letter
}

function selectUnit(unit: GameDatum): void {
  if (props.mode === 'list-only') {
    emit('select', unit)
    return
  }
  selectedUnit.value = unit
}

function back(): void {
  selectedUnit.value = null
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- detail-only mode: always render the detail view for detailUnit -->
    <template v-if="props.mode === 'detail-only'">
      <div v-if="!props.detailUnit" class="flex-1 flex items-center justify-center text-xs text-muted-foreground">
        Select a unit from the list.
      </div>
      <template v-else>
        <!-- Detail toolbar -->
        <div class="shrink-0 flex items-center gap-2 px-3 pt-2 pb-1.5 border-b border-border/50">
          <div class="flex-1" />
        </div>

        <!-- Detail card -->
        <UnitDetailCard :unit="props.detailUnit" />
      </template>
    </template>

    <!-- list-only or full mode -->
    <template v-else>
      <!-- Full mode: detail view when a unit is selected -->
      <template v-if="selectedUnit && props.mode === 'full'">
        <!-- Detail toolbar -->
        <div class="shrink-0 flex items-center gap-2 px-3 pt-2 pb-1.5 border-b border-border/50">
          <button class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            @click="back">
            <ArrowLeft class="w-3 h-3" />
            Back
          </button>
          <div class="flex-1" />
          <button v-if="showCompareButton"
            class="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border border-border rounded px-2 py-0.5 transition-colors hover:border-primary/50"
            title="Compare with another unit" @click="emit('compare', selectedUnit)">
            <GitCompare class="w-3 h-3" />
            Compare
          </button>
        </div>

        <!-- Detail card -->
        <UnitDetailCard :unit="selectedUnit" />
      </template>

      <!-- Browse view (list-only mode, or full mode with no unit selected) -->
      <template v-else>
        <!-- Search -->
        <div class="px-3 pt-3 pb-2 shrink-0">
          <Input v-model="search" placeholder="Search units…" class="h-8 text-xs" />
        </div>

        <!-- Filter row -->
        <div class="px-3 pb-2 shrink-0 flex flex-wrap items-center gap-2">
          <div class="flex gap-0.5 bg-muted/50 rounded p-0.5">
            <button v-for="opt in [
              { value: 'all', label: 'All' },
              { value: 'vehicle', label: 'Vehicles' },
              { value: 'ordnance', label: 'Ordnance' },
            ] as const" :key="opt.value" :class="[
              'px-2 py-0.5 text-[11px] rounded transition-colors',
              typeFilter === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]" @click="typeFilter = opt.value">
              {{ opt.label }}
            </button>
          </div>
          <Select v-model="nationFilter">
            <SelectTrigger class="h-6 w-auto gap-1 border-border bg-muted/50 px-1.5 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All nations</SelectItem>
              <SelectItem v-for="n in availableNations" :key="n" :value="n">{{ n }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Letter chips (when not searching/filtering) -->
        <div v-if="!isFiltering" class="px-3 pb-2 flex flex-wrap gap-1 shrink-0">
          <button v-for="letter in availableLetters" :key="letter" :class="[
            'w-6 h-6 text-xs rounded font-mono transition-colors',
            activeLetter === letter
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 hover:bg-muted text-foreground/70',
          ]" @click="toggleLetter(letter)">
            {{ letter }}
          </button>
        </div>

        <!-- Results list -->
        <div class="flex-1 overflow-y-auto px-3 pb-3">
          <div v-if="!showList" class="text-xs text-muted-foreground py-4 text-center">
            Select a letter or search above.
          </div>
          <div v-else-if="filteredUnits.length === 0" class="text-xs text-muted-foreground py-4 text-center">
            No units found.
          </div>
          <div v-for="unit in filteredUnits" v-else :key="unit.id"
            class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent transition-colors"
            role="button" tabindex="0" @click="selectUnit(unit)" @keydown.enter="selectUnit(unit)">
            <span class="text-xs text-foreground flex-1 truncate">{{ unit.name }}</span>
            <span v-if="unitNation(unit)" class="text-[10px] text-muted-foreground shrink-0">{{
              unitNation(unit)
            }}</span>
            <span :class="[
              'text-[10px] font-medium rounded px-1.5 py-0.5 shrink-0',
              unit.type === 'vehicle'
                ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                : 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
            ]">{{ unitTypeLabel(unit) }}</span>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<!-- Scoped styles are intentionally empty — unit-note HTML is styled via global Tailwind prose-like rules -->
