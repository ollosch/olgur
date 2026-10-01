import { describe, it, expect } from 'vitest'
import { computeOverflow } from '@/composables/useToolbarOverflow'

function widths(pairs: [string, number][]): Map<string, number> {
  return new Map(pairs)
}

describe('computeOverflow', () => {
  it('shows everything when there is plenty of room', () => {
    const result = computeOverflow(
      ['t1', 't2'],
      ['b1', 'b2'],
      widths([['t1', 40], ['t2', 40]]),
      widths([['b1', 60], ['b2', 60]]),
      400,
    )

    expect(result.visibleToolIds).toEqual(['t1', 't2'])
    expect(result.hiddenToolIds).toEqual([])
    expect(result.visibleBookmarkIds).toEqual(['b1', 'b2'])
    expect(result.hiddenBookmarkIds).toEqual([])
  })

  it('overflows bookmarks before tools when narrow', () => {
    const result = computeOverflow(
      ['t1', 't2'],
      ['b1', 'b2', 'b3'],
      widths([['t1', 40], ['t2', 40]]),
      widths([['b1', 60], ['b2', 60], ['b3', 60]]),
      200,
    )

    expect(result.visibleToolIds).toEqual(['t1', 't2'])
    expect(result.hiddenToolIds).toEqual([])
    expect(result.visibleBookmarkIds).toEqual(['b1'])
    expect(result.hiddenBookmarkIds).toEqual(['b2', 'b3'])
  })

  it('overflows the rightmost tools into their own group', () => {
    const result = computeOverflow(
      ['t1', 't2', 't3'],
      [],
      widths([['t1', 100], ['t2', 100], ['t3', 100]]),
      widths([]),
      150,
    )

    expect(result.visibleToolIds).toEqual(['t1'])
    expect(result.hiddenToolIds).toEqual(['t2', 't3'])
    expect(result.visibleBookmarkIds).toEqual([])
    expect(result.hiddenBookmarkIds).toEqual([])
  })

  it('overflows everything when the container is tiny', () => {
    const result = computeOverflow(
      ['t1'],
      ['b1'],
      widths([['t1', 40]]),
      widths([['b1', 60]]),
      20,
    )

    expect(result.visibleToolIds).toEqual([])
    expect(result.hiddenToolIds).toEqual(['t1'])
    expect(result.visibleBookmarkIds).toEqual([])
    expect(result.hiddenBookmarkIds).toEqual(['b1'])
  })
})
