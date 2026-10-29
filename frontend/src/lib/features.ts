import type { GameDatum } from '@/types/domain'

export const ASL_TABLE_KINDS = [
  'ift',
  'cct',
  'leader_creation',
  'to_hit',
  'to_kill',
  'destruction',
] as const

export type AslTableKind = (typeof ASL_TABLE_KINDS)[number]

export function parseFeatureFlag(value: unknown, fallback: boolean): boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

const DEV_DEFAULT =
  Boolean(import.meta.env.VITEST) || import.meta.env.MODE === 'development'

export const FEATURES = {
  aslTables: parseFeatureFlag(import.meta.env.VITE_FEATURE_ASL_TABLES, DEV_DEFAULT),
  afvVsAfv: parseFeatureFlag(import.meta.env.VITE_FEATURE_AFV_VS_AFV, DEV_DEFAULT),
}

export function isAslTableKind(kind: unknown): kind is AslTableKind {
  return typeof kind === 'string' && (ASL_TABLE_KINDS as readonly string[]).includes(kind)
}

export function isAslTable(item: GameDatum): boolean {
  return item.type === 'table' && isAslTableKind(item.content['kind'])
}

export function isTableVisible(
  item: GameDatum,
  aslTablesEnabled: boolean = FEATURES.aslTables,
): boolean {
  return aslTablesEnabled || !isAslTable(item)
}

export function resolveToolType(
  type: GameDatum['type'],
  afvVsAfvEnabled: boolean = FEATURES.afvVsAfv,
): GameDatum['type'] {
  return type === 'ordnance' && !afvVsAfvEnabled ? 'vehicle' : type
}
