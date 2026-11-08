<script setup lang="ts">
import { computed } from 'vue'
import { unitNation, unitTypeLabel } from '@/lib/unitUtils'
import type { GameDatum } from '@/types/domain'

const props = defineProps<{
  unit: GameDatum
}>()

interface NationTheme {
  bg: string
  paper: string
  ink: string
  accent: string
}

const NATION_THEMES: Record<string, NationTheme> = {
  german: { bg: '#93a39d', paper: '#f4f1e4', ink: '#17201d', accent: '#42554e' },
  russian: { bg: '#c39a78', paper: '#f7f1e3', ink: '#2a1b12', accent: '#7b4b2e' },
  us: { bg: '#a7b489', paper: '#f6f4e4', ink: '#1f2818', accent: '#5b6b45' },
  british: { bg: '#d3c295', paper: '#fbf7e8', ink: '#2b2416', accent: '#8a7448' },
  italian: { bg: '#adb29b', paper: '#f5f3e6', ink: '#22261f', accent: '#6c7460' },
  japanese: { bg: '#d1ba86', paper: '#fbf6e6', ink: '#2c2414', accent: '#8a7240' },
  french: { bg: '#a9b3ba', paper: '#f4f6f6', ink: '#1e262b', accent: '#5f7078' },
  chinese: { bg: '#c2b28d', paper: '#f8f4e7', ink: '#2a2417', accent: '#7c6a48' },
  allied: { bg: '#bfc0a4', paper: '#f7f6e8', ink: '#252619', accent: '#75785a' },
  default: { bg: '#c5bcaa', paper: '#f7f4e9', ink: '#2a2720', accent: '#7d735f' },
}

const theme = computed((): NationTheme => {
  const nation = (props.unit.content['nation'] as string | undefined)?.toLowerCase() ?? ''
  return NATION_THEMES[nation] ?? NATION_THEMES.default!
})

const counterStyle = computed(() => ({
  backgroundColor: theme.value.bg,
  color: theme.value.ink,
  borderColor: theme.value.ink,
}))

const boxStyle = computed(() => ({
  backgroundColor: theme.value.paper,
  color: theme.value.ink,
  borderColor: theme.value.ink,
}))

const isVehicle = computed((): boolean => props.unit.type === 'vehicle')

function raw(key: string): string {
  const value = props.unit.content[key]
  if (value === null || value === undefined) return ''
  return String(value)
}

function text(key: string): string {
  return raw(key)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function gunParts(value: string): { number: string; suffix: string } {
  const clean = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const match = clean.match(/^([\d.]+)(.*)$/)
  if (!match) return { number: clean, suffix: '' }
  return { number: match[1] ?? clean, suffix: (match[2] ?? '').trim() }
}

// ── Vehicle ──────────────────────────────────────────────────────────────────

const vehicleType = computed((): string => text('type') || 'AFV')
const af = computed((): string[] => text('af').split('/').filter(Boolean))
const frontAf = computed((): string => af.value[0] ?? '')
const sideAf = computed((): string => af.value.slice(1).join('/'))
const turretArmor = computed((): string => text('ta'))
const movement = computed((): string => text('mp'))
const mainArmament = computed(() => gunParts(raw('ma')))
const rof = computed((): string => text('rof'))
const breakdown = computed((): string => {
  const b = text('b')
  return b && b !== '0' ? `B${b}` : ''
})
const infantryFire = computed((): string => {
  const value = text('ife')
  return value && value !== '0' ? value : ''
})
const machineGuns = computed((): string =>
  [text('bmg') || '-', text('cmg') || '-', text('aamg') || '-'].join('/'),
)
const smoke = computed((): string => text('s'))
const turretType = computed((): string => text('gt'))

const turretShape = computed((): string => {
  switch (turretType.value) {
    case 'T':
      return 'rounded-full border-2'
    case 'ST':
      return 'rounded-sm border-2'
    case 'RST':
      return 'rounded-sm border-4'
    case '1MT':
      return 'rounded-sm border-4 border-dashed'
    case 'T-NT':
      return 'rounded-full border-2'
    default:
      return 'border-0'
  }
})

// ── Ordnance ─────────────────────────────────────────────────────────────────

const gunType = computed((): string => text('type') || 'GUN')

const caliber = computed(
  (): {
    number: string
    suffix: string
    overline: boolean
    underline: boolean
  } => {
    const source = raw('csize')
    const overline = /text-decoration:\s*overline/i.test(source)
    const underline = /text-decoration:\s*underline/i.test(source)
    const clean = source.replace(/<[^>]*>/g, '').trim()
    const match = clean.match(/^([\d.]+)(.*)$/)
    return {
      number: match?.[1] ?? clean,
      suffix: (match?.[2] ?? '').trim(),
      overline,
      underline,
    }
  },
)

const rateOfFire = computed((): { main: string; ife: string; suffix: string } => {
  const clean = text('rof')
  const match = clean.match(/^([^()]*?)(?:\s*\(([^)]*)\))?\s*(.*)$/)
  return {
    main: (match?.[1] ?? clean).trim(),
    ife: (match?.[2] ?? '').trim(),
    suffix: (match?.[3] ?? '').trim(),
  }
})

const gunBreakdown = computed((): string => {
  const b = text('b')
  return b ? `B${b}` : ''
})

const manhandling = computed((): string => {
  const m = text('m')
  return m ? `M${m}` : ''
})

const targetSize = computed((): string => text('tsize'))

const manhandlingShape = computed((): string => {
  if (targetSize.value.includes('+')) return 'border-red-900/70 bg-red-600/80 text-white'
  if (targetSize.value.includes('-')) return 'border-black/60 bg-white/90 text-black'
  return 'border-black/40 bg-white/80 text-black'
})

const range = computed((): string => text('range'))

// ── Shared ───────────────────────────────────────────────────────────────────

const dates = computed((): string => {
  const from = text('date_from') || text('date') || text('dates')
  const to = text('date_to')
  if (from && to) return `${from}–${to}`
  return from
})

const tags = computed((): string[] => {
  if (isVehicle.value) {
    const list: string[] = []
    if (text('sa')) list.push(`SA ${text('sa')}`)
    if (smoke.value) list.push(`Smoke ${smoke.value}`)
    if (text('rf')) list.push(`RF ${text('rf')}`)
    return list
  }

  return text('special')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
})
</script>

<template>
  <div class="flex-1 overflow-y-auto px-3 py-3">
    <div class="mx-auto w-full max-w-sm">
      <div class="mb-2 flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-foreground leading-tight">{{ props.unit.name }}</h2>
          <p class="mt-0.5 text-[11px] text-muted-foreground">
            {{ unitNation(props.unit) || 'Unknown' }} · {{ unitTypeLabel(props.unit) }}
          </p>
        </div>
        <span
          class="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {{ isVehicle ? 'AFV' : 'Ordnance' }}
        </span>
      </div>

      <!-- Counter front -->
      <div
        class="relative mx-auto aspect-square w-full max-w-[320px] select-none rounded-sm border-2 shadow-lg"
        :style="counterStyle"
        data-test="unit-counter"
      >
        <div class="pointer-events-none absolute inset-1 border opacity-30" :style="counterStyle" />

        <!-- Vehicle layout -->
        <template v-if="isVehicle">
          <svg
            class="absolute inset-0 h-full w-full p-6 opacity-70"
            viewBox="0 0 200 200"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M38 58 H162 L176 72 V128 L162 142 H38 L24 128 V72 Z" />
            <rect x="30" y="44" width="140" height="18" rx="9" />
            <rect x="30" y="138" width="140" height="18" rx="9" />
            <circle cx="100" cy="100" r="30" />
            <line x1="100" y1="100" x2="100" y2="26" stroke-width="6" />
            <circle cx="100" cy="100" r="6" fill="currentColor" stroke="none" />
            <path d="M62 82 H138" stroke-width="2" opacity="0.45" />
          </svg>

          <!-- Identifier -->
          <div
            class="absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center border-2 px-1 text-sm font-black tracking-tight"
            :style="boxStyle"
          >
            {{ vehicleType }}
          </div>

          <!-- Movement -->
          <div class="absolute right-3 top-3 flex flex-col items-center">
            <div
              class="flex h-14 min-w-14 items-center justify-center rounded-md border-2 px-2 text-3xl font-black leading-none"
              :style="boxStyle"
            >
              {{ movement }}
            </div>
            <span class="mt-0.5 text-[8px] font-bold uppercase tracking-wider">MP</span>
          </div>

          <!-- Armor factors -->
          <div class="absolute right-3 top-[6.4rem] flex flex-col items-center">
            <span class="text-[8px] font-bold uppercase tracking-wider">AF</span>
            <div class="mt-0.5 flex items-end gap-1">
              <span class="text-2xl font-black leading-none">{{ frontAf }}</span>
              <span
                v-if="sideAf"
                class="flex h-8 min-w-8 items-center justify-center border-2 px-1 text-sm font-black leading-none"
                :style="boxStyle"
              >
                {{ sideAf }}
              </span>
            </div>
            <span v-if="turretArmor" class="mt-0.5 text-[8px] font-bold">{{ turretArmor }}</span>
          </div>

          <!-- Rate of fire -->
          <div class="absolute left-3 top-1/2 flex -translate-y-1/2 flex-col items-center">
            <div
              class="flex h-9 min-w-9 items-center justify-center border-2 px-1 text-xl font-black leading-none"
              :style="boxStyle"
            >
              {{ rof }}
            </div>
            <span v-if="breakdown" class="mt-0.5 text-[9px] font-black">{{ breakdown }}</span>
          </div>

          <!-- Main armament -->
          <div class="absolute bottom-12 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <div
              class="flex items-baseline gap-0.5 px-3 py-1"
              :class="turretShape"
              :style="{ borderColor: theme.ink }"
            >
              <span v-if="mainArmament.suffix.includes('*')" class="text-2xl font-black">*</span>
              <span class="text-3xl font-black leading-none">{{ mainArmament.number }}</span>
              <span class="text-lg font-black leading-none">{{
                mainArmament.suffix.replace(/\*/g, '')
              }}</span>
              <span v-if="infantryFire" class="text-sm font-bold">({{ infantryFire }})</span>
            </div>
          </div>

          <!-- Machine guns -->
          <div class="absolute bottom-12 right-3 flex flex-col items-end">
            <span class="text-[8px] font-bold uppercase tracking-wider">MG</span>
            <div
              class="mt-0.5 border-2 px-1.5 py-0.5 text-sm font-black leading-none"
              :style="boxStyle"
            >
              {{ machineGuns }}
            </div>
            <span v-if="smoke" class="mt-0.5 text-[8px] font-bold">s{{ smoke }}</span>
          </div>
        </template>

        <!-- Ordnance layout -->
        <template v-else>
          <svg
            class="absolute inset-0 h-full w-full p-6 opacity-60"
            viewBox="0 0 200 200"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="100" y1="100" x2="196" y2="100" stroke-dasharray="4 6" opacity="0.45" />
            <line x1="100" y1="100" x2="100" y2="4" stroke-dasharray="4 6" opacity="0.35" />
            <line x1="100" y1="100" x2="160" y2="40" stroke-dasharray="2 7" opacity="0.35" />
            <line x1="100" y1="100" x2="100" y2="20" stroke-width="5" />
            <line x1="100" y1="100" x2="166" y2="148" stroke-width="4" />
            <line x1="100" y1="100" x2="34" y2="148" stroke-width="4" />
            <path d="M64 86 Q100 64 136 86 L130 112 Q100 124 70 112 Z" />
            <circle cx="100" cy="100" r="9" fill="currentColor" stroke="none" />
          </svg>

          <!-- Gun type -->
          <div class="absolute right-3 top-3 text-lg font-black tracking-tight">{{ gunType }}</div>

          <!-- Rate of fire -->
          <div class="absolute left-3 top-1/2 flex -translate-y-1/2 flex-col items-center">
            <div
              class="flex h-9 min-w-9 items-center justify-center border-2 px-1 text-xl font-black leading-none"
              :style="boxStyle"
            >
              {{ rateOfFire.main }}
            </div>
            <span v-if="gunBreakdown" class="mt-0.5 text-[9px] font-black">{{ gunBreakdown }}</span>
            <span v-if="rateOfFire.ife" class="mt-0.5 text-[9px] font-bold">
              ({{ rateOfFire.ife }})
            </span>
          </div>

          <!-- Manhandling -->
          <div class="absolute right-3 top-14 flex flex-col items-center">
            <div
              v-if="manhandling"
              class="flex h-9 min-w-9 items-center justify-center rounded-full border-2 px-1 text-xs font-black leading-none"
              :class="manhandlingShape"
            >
              {{ manhandling }}
            </div>
            <span v-if="targetSize" class="mt-0.5 text-[8px] font-bold">{{ targetSize }}</span>
          </div>

          <!-- Caliber -->
          <div class="absolute bottom-7 left-4 flex items-baseline">
            <span
              class="text-3xl font-black leading-none"
              :class="{ overline: caliber.overline, underline: caliber.underline }"
            >
              {{ caliber.number }}
            </span>
            <span class="text-lg font-black leading-none">{{ caliber.suffix }}</span>
          </div>

          <!-- Range (mortars print it) -->
          <div v-if="range" class="absolute bottom-7 right-3 text-lg font-black leading-none">
            {{ gunType === 'MTR' ? `[${range}]` : range }}
          </div>

          <!-- Barrel / IFE suffix -->
          <div
            v-if="rateOfFire.suffix"
            class="absolute bottom-16 right-3 text-[9px] font-bold uppercase tracking-wide"
          >
            {{ rateOfFire.suffix }}
          </div>
        </template>

        <!-- Bottom strip -->
        <div
          class="absolute inset-x-3 bottom-2 flex items-center justify-between text-[8px] font-bold uppercase tracking-wider opacity-80"
        >
          <span>{{ unitNation(props.unit) || '—' }}</span>
          <span>{{ vehicleType === 'AFV' ? gunType : vehicleType }}</span>
        </div>
      </div>

      <!-- Supporting metadata -->
      <div class="mt-2 flex flex-wrap items-center gap-1">
        <span
          v-if="dates"
          class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >{{ dates }}</span
        >
        <span
          v-for="tag in tags"
          :key="tag"
          class="rounded bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >{{ tag }}</span
        >
      </div>
      <p class="mt-2 text-[10px] text-muted-foreground/70">
        ASL-style counter preview. The Details view remains the canonical reference.
      </p>
    </div>
  </div>
</template>
