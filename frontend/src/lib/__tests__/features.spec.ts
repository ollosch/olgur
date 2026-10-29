import { describe, it, expect } from 'vitest'
import {
  ASL_TABLE_KINDS,
  FEATURES,
  isAslTable,
  isAslTableKind,
  isTableVisible,
  parseFeatureFlag,
  resolveToolType,
} from '@/lib/features'
import type { GameDatum } from '@/types/domain'

function makeDatum(id: string, type: GameDatum['type'], kind?: string): GameDatum {
  return {
    id,
    module_id: 'mod1',
    type,
    slug: id,
    name: `Datum ${id}`,
    content: kind ? { kind } : {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

describe('parseFeatureFlag', () => {
  it('parses the explicit true and false strings', () => {
    expect(parseFeatureFlag('true', false)).toBe(true)
    expect(parseFeatureFlag('false', true)).toBe(false)
  })

  it('falls back for missing or unrecognised values', () => {
    expect(parseFeatureFlag(undefined, true)).toBe(true)
    expect(parseFeatureFlag(undefined, false)).toBe(false)
    expect(parseFeatureFlag('1', false)).toBe(false)
    expect(parseFeatureFlag(true, false)).toBe(false)
  })

  it('exposes boolean feature flags', () => {
    expect(typeof FEATURES.aslTables).toBe('boolean')
    expect(typeof FEATURES.afvVsAfv).toBe('boolean')
  })
})

describe('ASL table kind detection', () => {
  it('recognises every ASL table kind', () => {
    for (const kind of ASL_TABLE_KINDS) {
      expect(isAslTableKind(kind)).toBe(true)
    }
  })

  it('rejects non-ASL and malformed kinds', () => {
    expect(isAslTableKind('matrix')).toBe(false)
    expect(isAslTableKind('attribute_table')).toBe(false)
    expect(isAslTableKind('modifier_list')).toBe(false)
    expect(isAslTableKind(undefined)).toBe(false)
    expect(isAslTableKind(42)).toBe(false)
  })

  it('only treats table game data as ASL tables', () => {
    expect(isAslTable(makeDatum('t1', 'table', 'ift'))).toBe(true)
    expect(isAslTable(makeDatum('t2', 'table', 'matrix'))).toBe(false)
    expect(isAslTable(makeDatum('s1', 'sop'))).toBe(false)
  })
})

describe('isTableVisible', () => {
  it('hides ASL tables when the flag is off', () => {
    expect(isTableVisible(makeDatum('t1', 'table', 'ift'), false)).toBe(false)
  })

  it('keeps ASL tables when the flag is on', () => {
    expect(isTableVisible(makeDatum('t1', 'table', 'ift'), true)).toBe(true)
  })

  it('keeps generic tables and non-table data regardless of the flag', () => {
    expect(isTableVisible(makeDatum('t1', 'table', 'matrix'), false)).toBe(true)
    expect(isTableVisible(makeDatum('v1', 'vehicle'), false)).toBe(true)
  })
})

describe('resolveToolType', () => {
  it('routes ordnance to Unit Data when AFV vs AFV is off', () => {
    expect(resolveToolType('ordnance', false)).toBe('vehicle')
  })

  it('keeps ordnance when AFV vs AFV is on', () => {
    expect(resolveToolType('ordnance', true)).toBe('ordnance')
  })

  it('leaves other game-data types unchanged', () => {
    expect(resolveToolType('vehicle', false)).toBe('vehicle')
    expect(resolveToolType('table', false)).toBe('table')
    expect(resolveToolType('sop', false)).toBe('sop')
  })
})
