<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { ArrowLeft, GitCompare } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { SEARCH_DEBOUNCE_MS, rankMatchLower } from '@/lib/utils'
import { unitTypeLabel, unitNation, VEHICLE_TYPE_LABELS, ORDNANCE_TYPE_LABELS } from '@/lib/unitUtils'
import { useContentStore } from '@/stores/content'
import type { GameDatum } from '@/types/domain'

const props = withDefaults(defineProps<{
  initialUnit?: GameDatum | null
  showCompareButton?: boolean
}>(), {
  initialUnit: null,
  showCompareButton: true,
})

const emit = defineEmits<{
  compare: [unit: GameDatum]
}>()

const contentStore = useContentStore()

// ── State ────────────────────────────────────────────────────────────────────

const search = ref('')
const debouncedSearch = refDebounced(search, SEARCH_DEBOUNCE_MS)
const activeLetter = ref<string | null>(null)
const typeFilter = ref<'all' | 'vehicle' | 'ordnance'>('all')
const nationFilter = ref<string>('all')
const selectedUnit = ref<GameDatum | null>(props.initialUnit ?? null)

watch(() => props.initialUnit, (unit) => {
  if (unit) {
    selectedUnit.value = unit
  }
})

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

const isFiltering = computed((): boolean =>
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
  selectedUnit.value = unit
}

function back(): void {
  selectedUnit.value = null
}

// ── Unit field helpers ────────────────────────────────────────────────────────

function field(item: GameDatum, key: string): unknown {
  return item.content[key]
}

function fieldStr(item: GameDatum, key: string): string {
  const v = item.content[key]
  if (v === null || v === undefined) return ''
  return String(v)
}

function fieldBool(item: GameDatum, key: string): boolean {
  const v = item.content[key]
  return v === true || v === 'true' || v === 1 || v === '1'
}

interface StatField { label: string; value: string }

function vehicleStats(item: GameDatum): StatField[] {
  const pairs: [string, string][] = [
    ['BPV', 'bpv'],
    ['RF', 'rf'],
    ['Size', 'size'],
    ['AF', 'af'],
    ['TA', 'ta'],
    ['CS', 'cs'],
    ['MP', 'mp'],
  ]
  return pairs
    .map(([label, key]) => ({ label, value: fieldStr(item, key) }))
    .filter((f) => f.value !== '')
}

function vehicleArmament(item: GameDatum): StatField[] {
  const pairs: [string, string][] = [
    ['Main Armament', 'ma'],
    ['ROF', 'rof'],
    ['B#', 'b_num'],
    ['BMG', 'bmg'],
    ['CMG', 'cmg'],
    ['AAMG', 'aamg'],
    ['SA', 'sa'],
  ]
  return pairs
    .map(([label, key]) => ({ label, value: fieldStr(item, key) }))
    .filter((f) => f.value !== '')
}

function ordnanceStats(item: GameDatum): StatField[] {
  const pairs: [string, string][] = [
    ['BPV', 'bpv'],
    ['RF', 'rf'],
    ['ROF', 'rof'],
    ['B#', 'b_num'],
    ['Range', 'range'],
    ['M#', 'm_num'],
    ['TGT Size', 'tgt_size'],
  ]
  return pairs
    .map(([label, key]) => ({ label, value: fieldStr(item, key) }))
    .filter((f) => f.value !== '')
}

function unitDates(item: GameDatum): string {
  const from = fieldStr(item, 'date_from') || fieldStr(item, 'date')
  const to = fieldStr(item, 'date_to')
  if (from && to) return `${from}–${to}`
  return from
}

const vehicleTypeKeys = Object.keys(VEHICLE_TYPE_LABELS)
const ordnanceTypeKeys = Object.keys(ORDNANCE_TYPE_LABELS)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Detail view -->
    <template v-if="selectedUnit">
      <!-- Detail toolbar -->
      <div class="shrink-0 flex items-center gap-2 px-3 pt-2 pb-1.5 border-b border-border/50">
        <button
          class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          @click="back"
        >
          <ArrowLeft class="w-3 h-3" />
          Back
        </button>
        <div class="flex-1" />
        <button
          v-if="showCompareButton"
          class="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border border-border rounded px-2 py-0.5 transition-colors hover:border-primary/50"
          title="Compare with another unit"
          @click="emit('compare', selectedUnit)"
        >
          <GitCompare class="w-3 h-3" />
          Compare
        </button>
      </div>

      <!-- Detail card -->
      <div class="flex-1 overflow-y-auto px-3 py-3">
        <!-- Header -->
        <div class="mb-3">
          <div class="flex items-start justify-between gap-2">
            <h2 class="text-sm font-semibold text-foreground leading-tight">{{ selectedUnit.name }}</h2>
            <div class="flex items-center gap-1 shrink-0">
              <span
                v-if="unitNation(selectedUnit)"
                class="text-[10px] font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded px-1.5 py-0.5"
              >{{ unitNation(selectedUnit) }}</span>
              <span class="text-[10px] font-medium bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                {{ unitTypeLabel(selectedUnit) }}
              </span>
            </div>
          </div>
          <p v-if="unitDates(selectedUnit)" class="text-[11px] text-muted-foreground mt-0.5">
            {{ unitDates(selectedUnit) }}
          </p>
        </div>

        <!-- Vehicle detail -->
        <template v-if="selectedUnit.type === 'vehicle'">
          <!-- Stats -->
          <div v-if="vehicleStats(selectedUnit).length > 0" class="mb-3">
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Stats</p>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              <div
                v-for="f in vehicleStats(selectedUnit)"
                :key="f.label"
                class="bg-muted/50 rounded p-1.5 text-center"
              >
                <p class="text-[9px] text-muted-foreground uppercase tracking-wide">{{ f.label }}</p>
                <p class="text-xs font-mono font-semibold text-foreground">{{ f.value }}</p>
              </div>
            </div>
          </div>

          <!-- Armament -->
          <div v-if="vehicleArmament(selectedUnit).length > 0" class="mb-3">
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Armament</p>
            <div class="flex flex-col gap-0.5">
              <div
                v-for="f in vehicleArmament(selectedUnit)"
                :key="f.label"
                class="flex gap-2 items-baseline"
              >
                <span class="text-[10px] text-muted-foreground w-28 shrink-0">{{ f.label }}</span>
                <span class="text-xs text-foreground font-mono">{{ f.value }}</span>
              </div>
            </div>
          </div>

          <!-- Special flags -->
          <div v-if="fieldBool(selectedUnit, 'radioless') || fieldBool(selectedUnit, 'ot')" class="mb-3 flex gap-1.5">
            <span
              v-if="fieldBool(selectedUnit, 'radioless')"
              class="text-[10px] bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 rounded px-1.5 py-0.5 font-medium"
            >Radioless</span>
            <span
              v-if="fieldBool(selectedUnit, 'ot')"
              class="text-[10px] bg-orange-500/15 text-orange-700 dark:text-orange-400 rounded px-1.5 py-0.5 font-medium"
            >Open-topped</span>
          </div>
        </template>

        <!-- Ordnance detail -->
        <template v-else-if="selectedUnit.type === 'ordnance'">
          <!-- Stats -->
          <div v-if="ordnanceStats(selectedUnit).length > 0" class="mb-3">
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Stats</p>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              <div
                v-for="f in ordnanceStats(selectedUnit)"
                :key="f.label"
                class="bg-muted/50 rounded p-1.5 text-center"
              >
                <p class="text-[9px] text-muted-foreground uppercase tracking-wide">{{ f.label }}</p>
                <p class="text-xs font-mono font-semibold text-foreground">{{ f.value }}</p>
              </div>
            </div>
          </div>

          <!-- Caliber -->
          <div v-if="field(selectedUnit, 'csize')" class="mb-3">
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Caliber</p>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p class="text-xs text-foreground" v-html="fieldStr(selectedUnit, 'csize')" />
          </div>

          <!-- Special rules -->
          <div v-if="fieldStr(selectedUnit, 'special')" class="mb-3">
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Special</p>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="rule in fieldStr(selectedUnit, 'special').split(',').map((s) => s.trim()).filter(Boolean)"
                :key="rule"
                class="text-[10px] bg-muted rounded px-1.5 py-0.5 text-foreground"
              >{{ rule }}</span>
            </div>
          </div>
        </template>

        <!-- Note (shared, HTML allowed) -->
        <div v-if="field(selectedUnit, 'note')" class="mb-3">
          <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="text-xs text-foreground leading-relaxed unit-note" v-html="fieldStr(selectedUnit, 'note')" />
        </div>

        <!-- Dagger -->
        <div v-if="fieldStr(selectedUnit, 'dagger')" class="mb-3">
          <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">† Note</p>
          <p class="text-xs text-foreground">{{ fieldStr(selectedUnit, 'dagger') }}</p>
        </div>
      </div>
    </template>

    <!-- Browse view -->
    <template v-else>
      <!-- Search -->
      <div class="px-3 pt-3 pb-2 shrink-0">
        <Input v-model="search" placeholder="Search units…" class="h-8 text-xs" />
      </div>

      <!-- Filter row -->
      <div class="px-3 pb-2 shrink-0 flex flex-wrap items-center gap-2">
        <!-- Type toggle buttons -->
        <div class="flex gap-0.5 bg-muted/50 rounded p-0.5">
          <button
            v-for="opt in ([{ value: 'all', label: 'All' }, { value: 'vehicle', label: 'Vehicles' }, { value: 'ordnance', label: 'Ordnance' }] as const)"
            :key="opt.value"
            :class="[
              'px-2 py-0.5 text-[11px] rounded transition-colors',
              typeFilter === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="typeFilter = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Nation dropdown -->
        <select
          v-model="nationFilter"
          class="h-6 text-[11px] bg-muted/50 border border-border rounded px-1.5 text-foreground outline-none cursor-pointer"
        >
          <option value="all">All nations</option>
          <option v-for="n in availableNations" :key="n" :value="n">{{ n }}</option>
        </select>
      </div>

      <!-- Letter chips (when not searching/filtering) -->
      <div v-if="!isFiltering" class="px-3 pb-2 flex flex-wrap gap-1 shrink-0">
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

      <!-- Results list -->
      <div class="flex-1 overflow-y-auto px-3 pb-3">
        <!-- Empty state -->
        <div
          v-if="!showList"
          class="text-xs text-muted-foreground py-4 text-center"
        >
          Select a letter or search above.
        </div>

        <div v-else-if="filteredUnits.length === 0" class="text-xs text-muted-foreground py-4 text-center">
          No units found.
        </div>

        <!-- Unit rows -->
        <div
          v-for="unit in filteredUnits"
          v-else
          :key="unit.id"
          class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent transition-colors"
          role="button"
          tabindex="0"
          @click="selectUnit(unit)"
          @keydown.enter="selectUnit(unit)"
        >
          <span class="text-xs text-foreground flex-1 truncate">{{ unit.name }}</span>
          <span
            v-if="unitNation(unit)"
            class="text-[10px] text-muted-foreground shrink-0"
          >{{ unitNation(unit) }}</span>
          <span
            :class="[
              'text-[10px] font-medium rounded px-1.5 py-0.5 shrink-0',
              unit.type === 'vehicle'
                ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                : 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
            ]"
          >{{ unitTypeLabel(unit) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<!-- Scoped styles are intentionally empty — unit-note HTML is styled via global Tailwind prose-like rules -->
