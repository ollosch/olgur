<script setup lang="ts">
import { computed } from 'vue'
import { renderContent } from '@/lib/renderContent'
import { useTableHighlight } from '@/composables/useTableHighlight'
import type { CaseD, GunEntry, AfValue, UnarmoredBand } from '@/lib/toKill'

// ── Types ────────────────────────────────────────────────────────────────────

interface ModifierEntry {
  label: string
  value: string
  tags: string[]
  markers: string[]
  effect_type?: 'drm' | 'fp_multiplier' | 'column_shift' | 'other'
  effect_value?: number | null
}

interface ArmorFactor {
  af_values: AfValue[]
  notes?: string[]
}

type UnarmoredInfo =
  | { by_caliber: UnarmoredBand[]; critical_hit_doubles?: boolean }
  | { use_ap_table: boolean }
  | { final_tk: number; critical_hit_doubles?: boolean }

export interface ToKillContent {
  kind: 'to_kill'
  subtype?: 'ap' | 'apcr_apds' | 'heat' | 'he_flame'
  title?: string
  guns: GunEntry[]
  case_d: CaseD | null
  unarmored: UnarmoredInfo | null
  modifiers?: ModifierEntry[]
  armor_factor?: ArmorFactor
  notes?: string[]
}

const props = defineProps<{ content: ToKillContent }>()

const { onCellEnter, onCellLeave, onCellClick, isRowActive, isColActive } =
  useTableHighlight()

const gunRowId = 'tk'

// ── Gun-size table ───────────────────────────────────────────────────────────

const GUN_NOTE_COLORS: Record<string, string> = {
  purple: 'text-purple-400',
  red: 'text-red-400',
  brown: 'text-amber-600',
  yellow: 'text-yellow-300',
  blue: 'text-blue-400',
  green: 'text-green-400',
  orange: 'text-orange-400',
  teal: 'text-teal-400',
  pink: 'text-pink-400',
  grey: 'text-muted-foreground',
}

function noteColor(note: string): string {
  return GUN_NOTE_COLORS[note] ?? ''
}

function supLabel(note: string): string {
  return note.startsWith('sup') ? note.slice(3) : '●'
}

function gunTextColor(gun: GunEntry): string {
  const colorNote = gun.notes?.find((note) => GUN_NOTE_COLORS[note] !== undefined)
  return colorNote === undefined ? '' : (GUN_NOTE_COLORS[colorNote] ?? '')
}

const hasFinalTk = computed(() => props.content.guns.some((gun) => gun.final_tk !== undefined))

// ── Case D ───────────────────────────────────────────────────────────────────

function formatCaseDValue(value: number | null): string {
  if (value === null) return 'NA'
  return value > 0 ? `+${value}` : String(value)
}

// ── Unarmored target ─────────────────────────────────────────────────────────

type UnarmoredView =
  | { kind: 'text'; text: string }
  | { kind: 'bands'; bands: UnarmoredBand[]; doubles: boolean }
  | { kind: 'final'; finalTk: number; doubles: boolean }

const unarmoredView = computed<UnarmoredView | null>(() => {
  const info = props.content.unarmored
  if (info === null) return null

  if ('use_ap_table' in info) {
    return { kind: 'text', text: 'Use AP To Kill Table' }
  }

  if ('by_caliber' in info) {
    return { kind: 'bands', bands: info.by_caliber, doubles: info.critical_hit_doubles === true }
  }

  return { kind: 'final', finalTk: info.final_tk, doubles: info.critical_hit_doubles === true }
})
</script>

<template>
  <div class="overflow-x-auto">
    <h3
      v-if="props.content.title"
      class="text-base font-semibold text-foreground mb-4"
      data-test="to-kill-title"
    >
      {{ props.content.title }}
    </h3>

    <!-- Gun size → BASIC TK# table -->
    <table class="text-xs border-collapse min-w-max font-mono">
      <thead>
        <tr>
          <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
            Gun Size
          </th>
          <th
            v-for="gun in props.content.guns"
            :key="`size-${gun.size}`"
            class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
            :class="{ 'bg-primary/25': isColActive(gun.size) }"
          >
            <span :class="gunTextColor(gun)">{{ gun.size }}</span>
            <sup
              v-for="note in gun.notes ?? []"
              :key="note"
              class="text-[9px] ml-0.5"
              :class="noteColor(note)"
            >
              {{ supLabel(note) }}
            </sup>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
            BASIC TK#
          </th>
          <td
            v-for="gun in props.content.guns"
            :key="`tk-${gun.size}`"
            :data-col="gun.size"
            class="border border-border px-2 py-1 text-center text-foreground"
            :class="{ 'bg-primary/15': isColActive(gun.size) }"
            @mouseenter="onCellEnter(gunRowId, gun.size)"
            @mouseleave="onCellLeave()"
            @click="onCellClick(gunRowId, gun.size)"
          >
            {{ gun.basic_tk }}
          </td>
        </tr>
        <tr v-if="hasFinalTk">
          <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
            FINAL TK#
          </th>
          <td
            v-for="gun in props.content.guns"
            :key="`final-${gun.size}`"
            class="border border-border px-2 py-1 text-center text-foreground"
          >
            {{ gun.final_tk }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Case D table -->
    <section v-if="props.content.case_d" class="mt-6">
      <h3 class="text-sm font-semibold text-foreground mb-2">Case D TK# Change</h3>
      <table class="text-xs border-collapse min-w-max font-mono">
        <thead>
          <tr>
            <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
              Modification
            </th>
            <th
              v-for="range in props.content.case_d.ranges"
              :key="range.id"
              class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
              :class="{ 'bg-primary/25': isColActive(range.id) }"
            >
              {{ range.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in props.content.case_d.rows" :key="row.id">
            <th
              class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
              :class="{ 'bg-primary/25': isRowActive(row.id) }"
            >
              {{ row.label }}
            </th>
            <td
              v-for="range in props.content.case_d.ranges"
              :key="range.id"
              :data-row="row.id"
              :data-col="range.id"
              class="border border-border px-2 py-1 text-center text-foreground"
              :class="{ 'bg-primary/15': isRowActive(row.id) || isColActive(range.id) }"
              @mouseenter="onCellEnter(row.id, range.id)"
              @mouseleave="onCellLeave()"
              @click="onCellClick(row.id, range.id)"
            >
              {{ formatCaseDValue(props.content.case_d.values[row.id]?.[range.id] ?? null) }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Unarmored target -->
    <section v-if="unarmoredView" class="mt-6">
      <h3 class="text-sm font-semibold text-foreground mb-2">Unarmored Target</h3>
      <p v-if="unarmoredView.kind === 'text'" class="text-xs text-foreground">
        {{ unarmoredView.text }}
      </p>
      <ul v-else-if="unarmoredView.kind === 'bands'" class="text-xs text-foreground space-y-0.5">
        <li v-for="band in unarmoredView.bands" :key="band.band" class="font-mono">
          {{ band.band }}: {{ band.final_tk }}
        </li>
        <li v-if="unarmoredView.doubles" class="text-muted-foreground">
          Double if Critical Hit
        </li>
      </ul>
      <p v-else class="text-xs text-foreground">
        Final TK#: {{ unarmoredView.finalTk }}
        <span v-if="unarmoredView.doubles" class="text-muted-foreground">
          (Double if Critical Hit)
        </span>
      </p>
    </section>

    <!-- C7.2 Basic TK# modifications -->
    <section v-if="props.content.modifiers && props.content.modifiers.length > 0" class="mt-6">
      <h3 class="text-sm font-semibold text-foreground mb-2">C7.2 Basic TK# Modifications</h3>
      <table class="text-xs border-collapse min-w-max">
        <thead>
          <tr>
            <th class="border border-border px-3 py-1.5 text-left font-semibold text-foreground">
              Cause
            </th>
            <th
              class="border border-border px-3 py-1.5 text-center font-semibold text-foreground w-16"
            >
              Modifier
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in props.content.modifiers"
            :key="entry.label"
            class="hover:bg-muted/20 transition-colors"
          >
            <td class="border border-border px-3 py-1.5 text-foreground">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="renderContent(entry.label)" />
              <sup v-if="entry.markers.length > 0" class="text-[9px] ml-0.5 text-primary">
                {{ entry.markers.join('') }}
              </sup>
            </td>
            <td
              class="border border-border px-3 py-1.5 text-center font-mono font-semibold text-foreground"
            >
              {{ entry.value }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- C7.11 Armor Factor -->
    <section v-if="props.content.armor_factor" class="mt-6">
      <h3 class="text-sm font-semibold text-foreground mb-2">C7.11 Armor Factor (AF)</h3>
      <table class="text-xs border-collapse min-w-max font-mono">
        <thead>
          <tr>
            <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
              AF
            </th>
            <th
              v-for="entry in props.content.armor_factor.af_values"
              :key="entry.af"
              class="border border-border px-2 py-1 text-center font-semibold text-foreground"
            >
              {{ entry.af }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
              AERIAL AF
            </th>
            <td
              v-for="entry in props.content.armor_factor.af_values"
              :key="entry.af"
              class="border border-border px-2 py-1 text-center text-foreground"
            >
              {{ entry.aerial ?? '' }}
            </td>
          </tr>
        </tbody>
      </table>
      <dl
        v-if="props.content.armor_factor.notes && props.content.armor_factor.notes.length > 0"
        class="mt-2 space-y-1"
      >
        <div
          v-for="(note, i) in props.content.armor_factor.notes"
          :key="i"
          class="flex gap-1.5 text-xs"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <dd class="text-muted-foreground" v-html="renderContent(note)" />
        </div>
      </dl>
    </section>

    <!-- Notes -->
    <dl v-if="props.content.notes && props.content.notes.length > 0" class="mt-3 space-y-1">
      <div v-for="(note, i) in props.content.notes" :key="i" class="flex gap-1.5 text-xs">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <dd class="text-muted-foreground" v-html="renderContent(note)" />
      </div>
    </dl>
  </div>
</template>
