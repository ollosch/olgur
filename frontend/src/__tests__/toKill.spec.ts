import { describe, it, expect } from 'vitest'
import {
  basicTk,
  caseDModifier,
  armorFactorAerial,
  unarmoredTk,
  type GunEntry,
  type CaseD,
  type AfValue,
  type UnarmoredBand,
} from '@/lib/toKill'

describe('basicTk', () => {
  const guns: GunEntry[] = [
    { size: '@MG', basic_tk: 4, notes: ['purple'] },
    { size: '76LL', basic_tk: 16, notes: ['brown'] },
    { size: '76LL', basic_tk: 23 },
    { size: '170L', basic_tk: 33 },
  ]

  it('returns the basic TK# for a known gun size', () => {
    expect(basicTk(guns, '@MG')).toBe(4)
    expect(basicTk(guns, '170L')).toBe(33)
  })

  it('returns null for an unknown gun size', () => {
    expect(basicTk(guns, 'nope')).toBeNull()
  })

  it('returns the FIRST match for a duplicated gun size', () => {
    expect(basicTk(guns, '76LL')).toBe(16)
  })
})

describe('caseDModifier', () => {
  const caseD: CaseD = {
    rows: [
      { id: 'le25', label: '≤ 25mm' },
      { id: '37_57', label: '37-57mm' },
    ],
    ranges: [
      { id: '0_1', label: '0-1', min: 0, max: 1 },
      { id: 'r2', label: '2', min: 2, max: 2 },
      { id: '3_6', label: '3-6', min: 3, max: 6 },
      { id: '7_12', label: '7-12', min: 7, max: 12 },
      { id: 'ge79', label: '79+', min: 79, max: null },
    ],
    values: {
      le25: { '0_1': 2, r2: 1, '3_6': 1, '7_12': 0, ge79: null },
      '37_57': { '0_1': 1, r2: 1, '3_6': 0, '7_12': 0, ge79: null },
    },
  }

  it('resolves a bounded range by its inclusive min/max', () => {
    expect(caseDModifier(caseD, 'le25', 0)).toBe(2)
    expect(caseDModifier(caseD, 'le25', 1)).toBe(2)
    expect(caseDModifier(caseD, 'le25', 2)).toBe(1)
    expect(caseDModifier(caseD, 'le25', 5)).toBe(1)
    expect(caseDModifier(caseD, 'le25', 12)).toBe(0)
  })

  it('resolves an open-ended range (null max)', () => {
    expect(caseDModifier(caseD, 'le25', 79)).toBeNull()
    expect(caseDModifier(caseD, 'le25', 150)).toBeNull()
  })

  it('returns null for a range that falls between bands', () => {
    expect(caseDModifier(caseD, 'le25', 13)).toBeNull()
  })

  it('returns null for a NA cell', () => {
    expect(caseDModifier(caseD, '37_57', 79)).toBeNull()
  })

  it('returns null when the Case D table is absent', () => {
    expect(caseDModifier(null, 'le25', 5)).toBeNull()
  })

  it('returns null for an unknown row', () => {
    expect(caseDModifier(caseD, 'nope', 5)).toBeNull()
  })
})

describe('armorFactorAerial', () => {
  const afValues: AfValue[] = [
    { af: '0*', aerial: 0 },
    { af: '1', aerial: 0 },
    { af: '2', aerial: 1 },
    { af: '4', aerial: 3 },
    { af: '11', aerial: 4 },
    { af: '14', aerial: null },
  ]

  it('maps an AF string to its aerial AF', () => {
    expect(armorFactorAerial(afValues, '0*')).toBe(0)
    expect(armorFactorAerial(afValues, '2')).toBe(1)
    expect(armorFactorAerial(afValues, '11')).toBe(4)
  })

  it('accepts a numeric AF', () => {
    expect(armorFactorAerial(afValues, 2)).toBe(1)
    expect(armorFactorAerial(afValues, 4)).toBe(3)
  })

  it('returns null for an AF with no aerial equivalent', () => {
    expect(armorFactorAerial(afValues, '14')).toBeNull()
  })

  it('returns null for an unknown AF', () => {
    expect(armorFactorAerial(afValues, '99')).toBeNull()
  })
})

describe('unarmoredTk', () => {
  const bands: UnarmoredBand[] = [
    { band: 'IFE/MG-15mm', final_tk: 'star_vehicle' },
    { band: 'ATR-28mm', final_tk: 7 },
    { band: '37-57mm', final_tk: 8 },
    { band: '65-77mm', final_tk: 9 },
    { band: '100+mm', final_tk: 11 },
  ]

  it('returns the star_vehicle band for the IFE/MG range', () => {
    expect(unarmoredTk(bands, 5)).toBe('star_vehicle')
    expect(unarmoredTk(bands, 15)).toBe('star_vehicle')
  })

  it('resolves a weapon-prefixed upper-bound band', () => {
    expect(unarmoredTk(bands, 20)).toBe(7)
    expect(unarmoredTk(bands, 28)).toBe(7)
  })

  it('resolves a bounded range', () => {
    expect(unarmoredTk(bands, 37)).toBe(8)
    expect(unarmoredTk(bands, 50)).toBe(8)
    expect(unarmoredTk(bands, 57)).toBe(8)
    expect(unarmoredTk(bands, 70)).toBe(9)
  })

  it('resolves an open-ended range', () => {
    expect(unarmoredTk(bands, 100)).toBe(11)
    expect(unarmoredTk(bands, 200)).toBe(11)
  })

  it('returns null for a caliber with no covering band', () => {
    expect(unarmoredTk(bands, 30)).toBeNull()
    expect(unarmoredTk(bands, 80)).toBeNull()
  })
})
