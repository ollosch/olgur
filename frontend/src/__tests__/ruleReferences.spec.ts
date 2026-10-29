import { describe, it, expect } from 'vitest'
import {
  displayRuleReference,
  formatRuleReference,
  isRuleRangeReference,
  parseRuleRange,
  parseRuleReference,
} from '@/lib/ruleReferences'
import type { Module, Rule } from '@/types/domain'

function makeModule(id: string, slug = id): Module {
  return {
    id,
    system_id: 'sys1',
    slug,
    name: `Module ${id}`,
    description: null,
    config: null,
    is_core: false,
    sort_order: 0,
    draft_revision: 0,
    permissions: {
      'module.update': false,
      'module.delete': false,
      'content.view_live': true,
      'content.view_released': false,
      'content.edit': false,
      'content.proofread': false,
      'version.publish': false,
      'version.amend_latest': false,
      'subscription.manage': false,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeRule(moduleId: string, number: string): Rule {
  return {
    id: `${moduleId}-${number}`,
    module_id: moduleId,
    number,
    title: 'Rule',
    content: '',
    sort_order: 0,
    parent_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

describe('parseRuleReference', () => {
  it('leaves bare references untouched', () => {
    expect(parseRuleReference('1.2')).toEqual({ number: '1.2' })
  })

  it('splits a module-slug prefix from the number', () => {
    expect(parseRuleReference('o:O.5.1')).toEqual({ moduleSlug: 'o', number: 'O.5.1' })
  })
})

describe('parseRuleRange', () => {
  it('returns null for a single reference', () => {
    expect(parseRuleRange('1.2')).toBeNull()
    expect(parseRuleRange('o:O.5.1')).toBeNull()
  })

  it('splits a bare range', () => {
    expect(parseRuleRange('1.2-1.5')).toEqual({ from: '1.2', to: '1.5' })
  })

  it('applies a prefix on the range to both bare endpoints', () => {
    expect(parseRuleRange('o:O.5.1-O.5.3')).toEqual({
      from: 'o:O.5.1',
      to: 'o:O.5.3',
    })
  })

  it('keeps prefixes already present on an endpoint', () => {
    expect(parseRuleRange('o:O.5.1-o:O.5.3')).toEqual({
      from: 'o:O.5.1',
      to: 'o:O.5.3',
    })
  })

  it('does not mistake a hyphenated slug for a range', () => {
    expect(isRuleRangeReference('red-barricades:O.5.1')).toBe(false)
    expect(parseRuleRange('red-barricades:O.5.1')).toBeNull()
  })
})

describe('displayRuleReference', () => {
  it('strips the module prefix from a single reference', () => {
    expect(displayRuleReference('o:O.5.1')).toBe('O.5.1')
  })

  it('strips the module prefix from both range endpoints', () => {
    expect(displayRuleReference('o:O.5.1-O.5.3')).toBe('O.5.1-O.5.3')
  })
})

describe('formatRuleReference', () => {
  it('stores a bare number on global rule-number systems', () => {
    const rule = makeRule('o', 'O.5.1')
    expect(
      formatRuleReference(rule, {
        globalRuleNumbers: true,
        entryModuleId: 'core',
        module: makeModule('o'),
      }),
    ).toBe('O.5.1')
  })

  it('keeps same-module references bare on non-global systems', () => {
    const rule = makeRule('core', '1.2')
    expect(
      formatRuleReference(rule, {
        globalRuleNumbers: false,
        entryModuleId: 'core',
        module: makeModule('core'),
      }),
    ).toBe('1.2')
  })

  it('qualifies another module reference with its slug on non-global systems', () => {
    const rule = makeRule('o', 'O.5.1')
    expect(
      formatRuleReference(rule, {
        globalRuleNumbers: false,
        entryModuleId: 'core',
        module: makeModule('o'),
      }),
    ).toBe('o:O.5.1')
  })
})
