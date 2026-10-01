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

  it('renders the gun & ammo section with a weapon row', () => {
    const wrapper = mount(ToHitTable, {
      props: {
        content: makeContent({
          gun_ammo: {
            columns: [
              { id: '0_6', label: '0-6', tags: [] },
              { id: 'gt54', label: '> 54', tags: [] },
            ],
            rows: [
              {
                id: 'star_weapon',
                label: '* Weapon',
                tags: [],
                cells: { '0_6': { value: '0' }, gt54: { value: '-1' } },
              },
            ],
          },
        }),
      },
    })

    expect(wrapper.text()).toContain('C4 Gun & Ammo Basic TH Number Modifications')
    expect(wrapper.text()).toContain('* Weapon')
    expect(wrapper.text()).toContain('-1')
  })

  it('renders a firer DRM entry', () => {
    const wrapper = mount(ToHitTable, {
      props: {
        content: makeContent({
          firer_drm: [
            {
              label: 'D. Pinned Firer/Spotter ({{L:C.5.4}})',
              value: '+2',
              tags: [],
              markers: ['L'],
            },
          ],
        }),
      },
    })

    expect(wrapper.text()).toContain('C5 Firer-Based Hit Determination DRM')
    expect(wrapper.text()).toContain('+2')

    const link = wrapper.find('a[data-rule-number="C.5.4"]')
    expect(link.exists()).toBe(true)
  })

  it('renders a target DRM entry', () => {
    const wrapper = mount(ToHitTable, {
      props: {
        content: makeContent({
          target_drm: [
            {
              label: 'J. Moved/Moving/Motion Vehicle or Dashing Infantry ({{L:C.6.1}})',
              value: '+2',
              tags: [],
              markers: ['@', 'L'],
            },
          ],
        }),
      },
    })

    expect(wrapper.text()).toContain('C6 Target-Based Hit Determination DRM')
    expect(wrapper.text()).toContain('+2')

    const link = wrapper.find('a[data-rule-number="C.6.1"]')
    expect(link.exists()).toBe(true)
  })

  it('renders footnotes via renderContent', () => {
    const wrapper = mount(ToHitTable, {
      props: {
        content: makeContent({
          footnotes: { '†': { text: 'NA when using Area Target Type', style: 'white' } },
        }),
      },
    })

    expect(wrapper.text()).toContain('[†]')
    expect(wrapper.text()).toContain('NA when using Area Target Type')
  })

  it('highlights the active row and column when hovering a C3 cell', async () => {
    const wrapper = mount(ToHitTable, { props: { content: makeContent() } })

    const cells = wrapper.findAll('td[data-row="vehicle"][data-col="0_6"]')
    expect(cells.length).toBe(2)

    await cells[0]!.trigger('mouseenter')

    for (const cell of cells) {
      expect(cell.classes()).toContain('bg-primary/15')
    }

    const rowHeader = wrapper.findAll('th').find((t) => t.text() === 'Vehicle')
    const colHeader = wrapper.findAll('th').find((t) => t.text() === '0-6')
    expect(rowHeader?.classes()).toContain('bg-primary/25')
    expect(colHeader?.classes()).toContain('bg-primary/25')

    await cells[0]!.trigger('mouseleave')
    expect(cells[0]!.classes()).not.toContain('bg-primary/15')
  })
})
