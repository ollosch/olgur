import { describe, it, expect } from 'vitest'
import { rankMatchLower, rankRule } from '@/lib/utils'

// ── rankMatchLower ─────────────────────────────────────────────────────────────

describe('rankMatchLower', () => {
  it('returns 0 for an exact match', () => {
    expect(rankMatchLower('foo', 'foo')).toBe(0)
  })

  it('returns 1 for a prefix match', () => {
    expect(rankMatchLower('foobar', 'foo')).toBe(1)
  })

  it('returns 2 for a contains (substring) match', () => {
    expect(rankMatchLower('bazfoobar', 'foo')).toBe(2)
  })

  it('returns 3 when there is no match', () => {
    expect(rankMatchLower('xyz', 'foo')).toBe(3)
  })

  it('returns 3 for a single-character query that is not an exact match', () => {
    // Single-char queries only score for exact matches to avoid noise
    expect(rankMatchLower('foobar', 'f')).toBe(3)
  })

  it('returns 0 for a single-character query that is an exact match', () => {
    expect(rankMatchLower('f', 'f')).toBe(0)
  })
})

// ── rankRule ───────────────────────────────────────────────────────────────────

describe('rankRule', () => {
  it('returns 0 when the rule number exactly matches the query', () => {
    expect(rankRule({ number: '1.2', title: 'Foo' }, '1.2')).toBe(0)
  })

  it('returns 1 when the rule number starts with the query', () => {
    expect(rankRule({ number: '1.2.3', title: 'Foo' }, '1.2')).toBe(1)
  })

  it('returns 2 when the rule number contains the query as a substring', () => {
    expect(rankRule({ number: 'A1.2B', title: 'Foo' }, '1.2')).toBe(2)
  })

  it('returns 3 when only the title exactly matches and the number does not', () => {
    expect(rankRule({ number: '99', title: 'movement' }, 'movement')).toBe(3)
  })

  it('returns 4 when only the title starts with the query and the number does not', () => {
    expect(rankRule({ number: '99', title: 'movement range' }, 'movement')).toBe(4)
  })

  it('returns 5 when only the title contains the query and the number does not', () => {
    expect(rankRule({ number: '99', title: 'group movement range' }, 'movement')).toBe(5)
  })

  it('returns 6 when neither the number nor the title matches', () => {
    expect(rankRule({ number: '99', title: 'nothing here' }, 'xyz')).toBe(6)
  })

  it('returns 6 when title is null and the number does not match', () => {
    expect(rankRule({ number: '99', title: null }, 'xyz')).toBe(6)
  })

  it('is case-insensitive for number matching — lowercases rule.number before comparing', () => {
    expect(rankRule({ number: 'A1', title: null }, 'a1')).toBe(0)
  })

  it('is case-insensitive for title matching — lowercases rule.title before comparing', () => {
    // 'Movement'.toLowerCase() === 'movement', so exact title match → rank 3
    expect(rankRule({ number: '99', title: 'Movement' }, 'movement')).toBe(3)
  })

  it('number matches always rank higher than equivalent title matches', () => {
    // Same query matches both number (contains = rank 2) and title (exact = rank 3+)
    // Number rank 2 should win over title rank 3
    expect(rankRule({ number: 'X1.2Y', title: '1.2' }, '1.2')).toBe(2)
  })
})
