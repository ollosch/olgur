import { describe, it, expect } from 'vitest'
import type { Component } from 'vue'
import {
  GAME_DATA_TOOL_COMPONENTS,
  SYSTEM_TOOL_COMPONENTS,
  gameDataTools,
} from '@/lib/gameDataTools'
import type { GameDatum } from '@/types/domain'

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

describe('game data tools', () => {
  it('maps vehicle and ordnance data to self-contained tool components', () => {
    expect(GAME_DATA_TOOL_COMPONENTS.vehicle).toBeDefined()
    expect(GAME_DATA_TOOL_COMPONENTS.ordnance).toBeDefined()
    expect(GAME_DATA_TOOL_COMPONENTS.sop).toBeUndefined()
    expect(GAME_DATA_TOOL_COMPONENTS.table).toBeUndefined()
  })

  it('derives unit browser and ordnance tools from game data', () => {
    const tools = gameDataTools([
      makeGameDatum('v1', 'vehicle'),
      makeGameDatum('o1', 'ordnance'),
      makeGameDatum('s1', 'sop'),
    ])

    expect(tools.map((t) => t.id)).toEqual(['vehicle', 'ordnance'])
    expect(tools.map((t) => t.label)).toEqual(['Unit Data', 'Ordnance vs Armor'])
  })

  it('ignores game-data types without a deployed tool', () => {
    expect(gameDataTools([makeGameDatum('s1', 'sop'), makeGameDatum('t1', 'table')])).toEqual([])
  })

  it('deduplicates repeated types in first-seen order', () => {
    const tools = gameDataTools([
      makeGameDatum('v1', 'vehicle'),
      makeGameDatum('v2', 'vehicle'),
      makeGameDatum('o1', 'ordnance'),
    ])

    expect(tools.map((t) => t.id)).toEqual(['vehicle', 'ordnance'])
  })

  it('returns no tools when no game data is present', () => {
    expect(gameDataTools([])).toEqual([])
  })

  it('lists a bespoke system tool first when the system slug matches', () => {
    const bespoke = {} as Component
    SYSTEM_TOOL_COMPONENTS.bcs = bespoke

    try {
      const tools = gameDataTools([makeGameDatum('v1', 'vehicle')], 'bcs')
      expect(tools.map((t) => t.id)).toEqual(['system:bcs', 'vehicle'])
      expect(tools[0]?.component).toBe(bespoke)
    } finally {
      delete SYSTEM_TOOL_COMPONENTS.bcs
    }
  })

  it('omits the bespoke system tool when no system slug matches', () => {
    expect(gameDataTools([], 'asl')).toEqual([])
  })
})
