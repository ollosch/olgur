<script setup lang="ts">
import { useAppSettingsStore } from '@/stores/appSettings'
import { renderContent } from '@/lib/renderContent'
import { unitTypeLabel, unitNation } from '@/lib/unitUtils'
import type { GameDatum } from '@/types/domain'

const props = defineProps<{
  unit: GameDatum
}>()

const appSettings = useAppSettingsStore()

// ── Field helpers ─────────────────────────────────────────────────────────────

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

interface StatField {
  label: string
  value: string
}

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
</script>

<template>
  <div class="flex-1 overflow-y-auto px-3 py-3">
    <!-- Header -->
    <div class="mb-3">
      <div class="flex items-start justify-between gap-2">
        <h2 class="text-sm font-semibold text-foreground leading-tight">{{ props.unit.name }}</h2>
        <div class="flex items-center gap-1 shrink-0">
          <span
            v-if="unitNation(props.unit)"
            class="text-[10px] font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded px-1.5 py-0.5"
            >{{ unitNation(props.unit) }}</span
          >
          <span
            class="text-[10px] font-medium bg-muted text-muted-foreground rounded px-1.5 py-0.5"
          >
            {{ unitTypeLabel(props.unit) }}
          </span>
        </div>
      </div>
      <p v-if="unitDates(props.unit)" class="text-[11px] text-muted-foreground mt-0.5">
        {{ unitDates(props.unit) }}
      </p>
    </div>

    <!-- Vehicle detail -->
    <template v-if="props.unit.type === 'vehicle'">
      <div v-if="vehicleStats(props.unit).length > 0" class="mb-3">
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Stats
        </p>
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          <div
            v-for="f in vehicleStats(props.unit)"
            :key="f.label"
            class="bg-muted/50 rounded p-1.5 text-center"
          >
            <p class="text-[9px] text-muted-foreground uppercase tracking-wide">{{ f.label }}</p>
            <p class="text-xs font-mono font-semibold text-foreground">{{ f.value }}</p>
          </div>
        </div>
      </div>
      <div v-if="vehicleArmament(props.unit).length > 0" class="mb-3">
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Armament
        </p>
        <div class="flex flex-col gap-0.5">
          <div
            v-for="f in vehicleArmament(props.unit)"
            :key="f.label"
            class="flex gap-2 items-baseline"
          >
            <span class="text-[10px] text-muted-foreground w-28 shrink-0">{{ f.label }}</span>
            <span class="text-xs text-foreground font-mono">{{ f.value }}</span>
          </div>
        </div>
      </div>
      <div
        v-if="fieldBool(props.unit, 'radioless') || fieldBool(props.unit, 'ot')"
        class="mb-3 flex gap-1.5"
      >
        <span
          v-if="fieldBool(props.unit, 'radioless')"
          class="text-[10px] bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 rounded px-1.5 py-0.5 font-medium"
          >Radioless</span
        >
        <span
          v-if="fieldBool(props.unit, 'ot')"
          class="text-[10px] bg-orange-500/15 text-orange-700 dark:text-orange-400 rounded px-1.5 py-0.5 font-medium"
          >Open-topped</span
        >
      </div>
    </template>

    <!-- Ordnance detail -->
    <template v-else-if="props.unit.type === 'ordnance'">
      <div v-if="ordnanceStats(props.unit).length > 0" class="mb-3">
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          Stats
        </p>
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          <div
            v-for="f in ordnanceStats(props.unit)"
            :key="f.label"
            class="bg-muted/50 rounded p-1.5 text-center"
          >
            <p class="text-[9px] text-muted-foreground uppercase tracking-wide">{{ f.label }}</p>
            <p class="text-xs font-mono font-semibold text-foreground">{{ f.value }}</p>
          </div>
        </div>
      </div>
      <div v-if="field(props.unit, 'csize')" class="mb-3">
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Caliber
        </p>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p
          class="text-xs text-foreground"
          v-html="renderContent(fieldStr(props.unit, 'csize'))"
        />
      </div>
      <div v-if="fieldStr(props.unit, 'special')" class="mb-3">
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          Special
        </p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="rule in fieldStr(props.unit, 'special')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)"
            :key="rule"
            class="text-[10px] bg-muted rounded px-1.5 py-0.5 text-foreground"
            >{{ rule }}</span
          >
        </div>
      </div>
    </template>

    <!-- Note (shared) -->
    <div v-if="field(props.unit, 'note')" class="mb-3">
      <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        Notes
      </p>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        class="text-xs text-foreground leading-relaxed unit-note"
        v-html="
          renderContent(fieldStr(props.unit, 'note'), { acronymPopups: appSettings.acronymPopups })
        "
      />
    </div>
    <div v-if="field(props.unit, 'notes')" class="mb-3">
      <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        Notes
      </p>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        class="text-xs text-foreground leading-relaxed unit-note"
        v-html="
          renderContent(fieldStr(props.unit, 'notes'), { acronymPopups: appSettings.acronymPopups })
        "
      />
    </div>
    <div v-if="fieldStr(props.unit, 'dagger')" class="mb-3">
      <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        † Note
      </p>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p
        class="text-xs text-foreground"
        v-html="
          renderContent(fieldStr(props.unit, 'dagger'), {
            acronymPopups: appSettings.acronymPopups,
          })
        "
      />
    </div>
  </div>
</template>
