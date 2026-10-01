<script setup lang="ts">
import { renderContent } from '@/lib/renderContent'
import { useTableHighlight } from '@/composables/useTableHighlight'
import AnnotationMarker from '@/components/game-data/AnnotationMarker.vue'

// ── Types ────────────────────────────────────────────────────────────────────

interface RangeBand {
  id: string
  label: string
  min: number
  max: number | null
}

interface TargetType {
  id: string
  label: string
}

interface ToHitValue {
  black: number | null
  red: number | null
}

interface GunAmmoColumn {
  id: string
  label: string
  tags: string[]
}

interface GunAmmoCell {
  value: string
}

interface GunAmmoRow {
  id: string
  label: string
  tags: string[]
  cells: Record<string, GunAmmoCell>
}

interface GunAmmoTable {
  columns: GunAmmoColumn[]
  rows: GunAmmoRow[]
}

interface ModifierEntry {
  label: string
  value: string
  tags: string[]
  markers: string[]
  effect_type?: 'drm' | 'fp_multiplier' | 'column_shift' | 'other'
  effect_value?: number | null
}

interface ModifierFootnote {
  text: string
  style?: string
}

export interface ToHitContent {
  kind: 'to_hit'
  title?: string
  range_bands: RangeBand[]
  target_types: TargetType[]
  values: Record<string, Record<string, ToHitValue>>
  gun_ammo?: GunAmmoTable
  firer_drm?: ModifierEntry[]
  target_drm?: ModifierEntry[]
  footnotes?: Record<string, ModifierFootnote>
}

const props = defineProps<{ content: ToHitContent }>()

// Separate highlight state for the C3 matrix and the C4 gun/ammo matrix — they
// share range-band column ids, so a single instance would cross-highlight.
const c3 = useTableHighlight()
const gunAmmo = useTableHighlight()

// ── C3 cell values ────────────────────────────────────────────────────────────

function cellValue(typeId: string, bandId: string): ToHitValue | null {
  return props.content.values[typeId]?.[bandId] ?? null
}

// ── Footnote styling ─────────────────────────────────────────────────────────

const footnoteStyleClass: Record<string, string> = {
  white: 'text-foreground',
  green: 'text-green-300',
  yellow: 'text-yellow-200',
  red: 'text-red-300',
  grey: 'text-muted-foreground',
}

function footnoteClass(fn: ModifierFootnote): string {
  if (!fn.style) return 'text-foreground'
  return footnoteStyleClass[fn.style] ?? 'text-foreground'
}
</script>

<template>
  <div class="overflow-x-auto max-w-full">
    <!-- C3 To Hit matrix -->
    <table class="text-xs border-collapse min-w-max font-mono">
      <thead>
        <tr>
          <th class="border border-border px-2 py-1 text-center font-semibold text-foreground">
            Target Type
          </th>
          <th
            v-for="band in props.content.range_bands"
            :key="band.id"
            class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
            :class="c3.colHeaderClasses(band.id)"
          >
            {{ band.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="type in props.content.target_types" :key="type.id">
          <th
            class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
            :class="c3.rowHeaderClasses(type.id)"
          >
            {{ type.label }}
          </th>
          <td
            v-for="band in props.content.range_bands"
            :key="band.id"
            :data-row="type.id"
            :data-col="band.id"
            class="border border-border px-2 py-1 text-center text-foreground"
            :class="c3.cellClasses(type.id, band.id)"
            @mouseenter="c3.onCellEnter(type.id, band.id)"
            @mouseleave="c3.onCellLeave()"
            @click="c3.onCellClick(type.id, band.id)"
          >
            <span v-if="cellValue(type.id, band.id)?.black !== null" class="text-foreground">
              {{ cellValue(type.id, band.id)?.black }}
            </span>
            <span class="ml-1 text-red-500">{{ cellValue(type.id, band.id)?.red }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- C4 Gun & Ammo basic TH number modifications -->
    <section v-if="props.content.gun_ammo" class="mt-6">
      <h3 class="text-sm font-semibold text-foreground mb-2">
        C4 Gun &amp; Ammo Basic TH Number Modifications
      </h3>
      <table class="text-xs border-collapse min-w-max">
        <thead>
          <tr>
            <th class="border border-border px-2 py-1 text-left text-muted-foreground font-medium">
              Weapon
            </th>
            <th
              v-for="col in props.content.gun_ammo.columns"
              :key="col.id"
              class="border border-border px-2 py-1 text-center font-semibold text-foreground whitespace-nowrap"
              :class="gunAmmo.colHeaderClasses(col.id)"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in props.content.gun_ammo.rows"
            :key="row.id"
            class="hover:bg-muted/20 transition-colors"
          >
            <td
              class="border border-border px-2 py-1 font-medium text-foreground whitespace-nowrap"
              :class="gunAmmo.rowHeaderClasses(row.id)"
            >
              {{ row.label }}
            </td>
            <td
              v-for="col in props.content.gun_ammo.columns"
              :key="col.id"
              :data-row="row.id"
              :data-col="col.id"
              class="border border-border px-2 py-1 text-center font-mono text-foreground"
              :class="gunAmmo.cellClasses(row.id, col.id)"
              @mouseenter="gunAmmo.onCellEnter(row.id, col.id)"
              @mouseleave="gunAmmo.onCellLeave()"
              @click="gunAmmo.onCellClick(row.id, col.id)"
            >
              {{ row.cells[col.id]?.value ?? '' }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- C5 Firer-based hit determination DRM -->
    <section v-if="props.content.firer_drm && props.content.firer_drm.length > 0" class="mt-6">
      <h3 class="text-sm font-semibold text-foreground mb-2">
        C5 Firer-Based Hit Determination DRM
      </h3>
      <table class="text-xs border-collapse min-w-max">
        <thead>
          <tr>
            <th class="border border-border px-3 py-1.5 text-left font-semibold text-foreground">
              Cause
            </th>
            <th
              class="border border-border px-3 py-1.5 text-center font-semibold text-foreground w-16"
            >
              DRM
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in props.content.firer_drm"
            :key="entry.label"
            class="hover:bg-muted/20 transition-colors"
          >
            <td class="border border-border px-3 py-1.5 text-foreground">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="renderContent(entry.label)" />
              <AnnotationMarker
                v-for="m in entry.markers"
                :key="m"
                :marker="m"
                :text="props.content.footnotes?.[m]?.text"
              />
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

    <!-- C6 Target-based hit determination DRM -->
    <section v-if="props.content.target_drm && props.content.target_drm.length > 0" class="mt-6">
      <h3 class="text-sm font-semibold text-foreground mb-2">
        C6 Target-Based Hit Determination DRM
      </h3>
      <table class="text-xs border-collapse min-w-max">
        <thead>
          <tr>
            <th class="border border-border px-3 py-1.5 text-left font-semibold text-foreground">
              Cause
            </th>
            <th
              class="border border-border px-3 py-1.5 text-center font-semibold text-foreground w-16"
            >
              DRM
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in props.content.target_drm"
            :key="entry.label"
            class="hover:bg-muted/20 transition-colors"
          >
            <td class="border border-border px-3 py-1.5 text-foreground">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-html="renderContent(entry.label)" />
              <AnnotationMarker
                v-for="m in entry.markers"
                :key="m"
                :marker="m"
                :text="props.content.footnotes?.[m]?.text"
              />
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

    <!-- Footnotes -->
    <dl
      v-if="props.content.footnotes && Object.keys(props.content.footnotes).length > 0"
      class="mt-3 space-y-1"
    >
      <div v-for="(fn, key) in props.content.footnotes" :key="key" class="flex gap-1.5 text-xs">
        <dt class="font-semibold text-primary shrink-0">[{{ key }}]</dt>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <dd :class="footnoteClass(fn)" v-html="renderContent(fn.text)" />
      </div>
    </dl>
  </div>
</template>
