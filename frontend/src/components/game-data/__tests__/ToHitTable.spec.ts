import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToHitTable from '@/components/game-data/ToHitTable.vue'
import type { ToHitContent } from '@/components/game-data/ToHitTable.vue'

function makeContent(overrides: Partial<ToHitContent> = {}): ToHitContent {
  return {
    kind: 'to_hit',
    range_bands: [
      { id: '0_6', label: '0-6', min: 0, max: 6 },
      { id: 'gt54', label: '> 54', min: 55, max: null },
    ],
    target_types: [
      { id: 'vehicle', label: 'Vehicle' },
      { id: 'area', label: 'Area (Mortar, SMOKE)' },
    ],
    values: {
      vehicle: {
        '0_6': { black: 10, red: 10 },
        gt54: { black: 2, red: 0 },
      },
      area: {
        '0_6': { black: null, red: 7 },
        gt54: { black: null, red: 5 },
      },
    },
    ...overrides,
  }
}

describe('ToHitTable', () => {
  it('renders the range-band header row', () => {
    const wrapper = mount(ToHitTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('Target Type')
    expect(wrapper.text()).toContain('0-6')
    expect(wrapper.text()).toContain('> 54')
    expect(wrapper.text()).toContain('black')
    expect(wrapper.text()).toContain('red')
  })

  it('renders a vehicle black/red value pair', () => {
    const wrapper = mount(ToHitTable, { props: { content: makeContent() } })

    const redSpans = wrapper.findAll('td.text-red-500')
    expect(redSpans.length).toBeGreaterThan(0)
    expect(redSpans.some((td) => td.text() === '10')).toBe(true)
    expect(wrapper.text()).toContain('Vehicle')
  })

  it('renders an empty black cell for area targets with null black value', () => {
    const wrapper = mount(ToHitTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('Area (Mortar, SMOKE)')
    const areaRow = wrapper.findAll('tbody tr').find((tr) => tr.text().includes('Area'))
    expect(areaRow).toBeDefined()
    const areaRed = areaRow!.findAll('td.text-red-500')
    expect(areaRed[0]?.text()).toBe('7')
  })
})
