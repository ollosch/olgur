import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { GameDatum } from '@/types/domain'

const featureState = vi.hoisted(() => ({ aslTables: true, afvVsAfv: true }))

vi.mock('@/lib/features', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/features')>()
  return { ...actual, FEATURES: featureState }
})

import { gameDataTools } from '@/lib/gameDataTools'

function makeGameDatum(id: string, type: GameDatum['type']): GameDatum {
  return {
    id,
    module_id: 'mod1',
    type,
    slug: id,
    name: `Datum ${id}`,
    content: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

describe('gameDataTools feature gating', () => {
  beforeEach(() => {
    featureState.aslTables = true
    featureState.afvVsAfv = true
  })

  it('keeps the ordnance tool when AFV vs AFV is on', () => {
    const tools = gameDataTools([
      makeGameDatum('v1', 'vehicle'),
      makeGameDatum('o1', 'ordnance'),
    ])

    expect(tools.map((t) => t.id)).toEqual(['vehicle', 'ordnance'])
    expect(tools.map((t) => t.label)).toEqual(['Unit Data', 'Ordnance vs Armor'])
  })

  it('omits the ordnance tool when AFV vs AFV is off', () => {
    featureState.afvVsAfv = false

    const tools = gameDataTools([
      makeGameDatum('v1', 'vehicle'),
      makeGameDatum('o1', 'ordnance'),
    ])

    expect(tools.map((t) => t.id)).toEqual(['vehicle'])
    expect(tools.map((t) => t.label)).toEqual(['Unit Data'])
  })

  it('still exposes Unit Data for ordnance-only data when AFV vs AFV is off', () => {
    featureState.afvVsAfv = false

    expect(gameDataTools([makeGameDatum('o1', 'ordnance')]).map((t) => t.id)).toEqual(['vehicle'])
  })
})
