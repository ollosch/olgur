import { describe, it, expect } from 'vitest'
import { activeTools, isKnownToolKey, moduleTools } from '@/lib/tools'
import type { Module } from '@/types/domain'

function makeModule(id: string, tools?: Module['tools']): Module {
  return {
    id,
    system_id: 'sys1',
    slug: id,
    name: `Module ${id}`,
    description: null,
    config: null,
    tools,
    is_core: true,
    sort_order: 0,
    permissions: {
      'module.update': false,
      'module.delete': false,
      'content.view_live': false,
      'content.view_released': false,
      'content.edit': false,
      'version.publish': false,
      'version.amend_latest': false,
      'subscription.manage': false,
      'module.activate': false,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

describe('tool registry', () => {
  it('recognizes known tool keys', () => {
    expect(isKnownToolKey('unit_browser')).toBe(true)
    expect(isKnownToolKey('ordnance_versus_armor')).toBe(true)
    expect(isKnownToolKey('not_a_tool')).toBe(false)
  })

  it('maps a module declaration to known tools, dropping unknown keys', () => {
    const module = makeModule('m1', [
      { key: 'unit_browser', config: {} },
      { key: 'unknown_tool', config: {} },
    ])

    expect(moduleTools(module).map((t) => t.key)).toEqual(['unit_browser'])
  })

  it('deduplicates tools across active modules in first-seen order', () => {
    const core = makeModule('core', [
      { key: 'unit_browser', config: {} },
      { key: 'ordnance_versus_armor', config: {} },
    ])
    const expansion = makeModule('exp', [{ key: 'unit_browser', config: {} }])

    expect(activeTools([core, expansion]).map((t) => t.key)).toEqual([
      'unit_browser',
      'ordnance_versus_armor',
    ])
  })

  it('returns no tools for modules without declarations', () => {
    expect(activeTools([makeModule('m1')])).toEqual([])
  })
})
