import type { GameDatum } from '@/types/domain'

// ── Type label mappings ───────────────────────────────────────────────────────

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  AFV: 'Armored Fighting Vehicle',
  Tt: 'Light Tank',
  HT: 'Half-track',
  AC: 'Armored Car',
  Tk: 'Tank',
  Art: 'Artillery',
  Arm: 'Armored',
  Wgn: 'Wagon',
  Tr: 'Truck',
  Car: 'Car',
  MC: 'Motorcycle',
  Jeep: 'Jeep',
  SPG: 'Self-Propelled Gun',
  TD: 'Tank Destroyer',
  AA: 'Anti-Aircraft Vehicle',
}

export const ORDNANCE_TYPE_LABELS: Record<string, string> = {
  MTR: 'Mortar',
  AT: 'Anti-Tank Gun',
  INF: 'Infantry Gun',
  AA: 'Anti-Aircraft',
  ART: 'Artillery',
  RCL: 'Recoilless Rifle',
  AAMG: 'AA Machine Gun',
  AATK: 'AA Anti-Tank',
  DC: 'Demolition Charge',
}

// ── Helper functions ──────────────────────────────────────────────────────────
export function unitTypeLabel(item: GameDatum): string {
  const raw = (item.content['type'] as string | undefined) ?? item.type
  if (item.type === 'vehicle') return VEHICLE_TYPE_LABELS[raw] ?? raw
  if (item.type === 'ordnance') return ORDNANCE_TYPE_LABELS[raw] ?? raw
  return raw
}

export function unitNation(item: GameDatum): string {
  const nation = item.content['nation'] as string | undefined
  if (!nation) return ''
  return nation.charAt(0).toUpperCase() + nation.slice(1)
}
