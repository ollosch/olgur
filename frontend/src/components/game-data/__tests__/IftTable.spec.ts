import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import IftTable from '@/components/game-data/IftTable.vue'
import type { IftContent } from '@/components/game-data/IftTable.vue'

function makeContent(overrides: Partial<IftContent> = {}): IftContent {
  return {
    kind: 'ift',
    columns: [
      {
        id: 'fp1',
        fp: 1,
        fp_label: '1',
        col_dr: 20,
        vehicle_dr: 3,
        annotations: ['Backblast', 'dr', 'ATR'],
      },
      {
        id: 'fp36',
        fp: 36,
        fp_label: '36+',
        col_dr: null,
        col_dr_label: '200+',
        vehicle_dr: 13,
        annotations: ['', 'A-T Mine', 'Set DC'],
      },
    ],
    rows: [{ id: 'le0', label: '≤ 0', dr: 0 }],
    cells: { le0: { fp1: '1KIA', fp36: '7KIA' } },
    ...overrides,
  }
}

describe('IftTable', () => {
  it('renders the staggered column headers', () => {
    const wrapper = mount(IftTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('Backblast')
    expect(wrapper.text()).toContain('DR/FP')
    expect(wrapper.text()).toContain('★Vehicle')
    expect(wrapper.text()).toContain('36+/200+')
  })

  it('renders a sample cell result', () => {
    const wrapper = mount(IftTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('1KIA')
    expect(wrapper.text()).toContain('7KIA')
  })

  it('renders a rule link from a {{L:...}} token in notes', () => {
    const wrapper = mount(IftTable, {
      props: { content: makeContent({ notes: ['See {{L:A.5.1.2}} for details'] }) },
    })

    const link = wrapper.find('a[data-rule-number="A.5.1.2"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('A.5.1.2')
  })

  it('renders the FP or DR modifiers section with rule links', () => {
    const wrapper = mount(IftTable, {
      props: {
        content: makeContent({
          modifiers: [
            {
              label: 'Set DC ({{L:A.23.7.1}})',
              value: '-3',
              tags: [],
              markers: [],
            },
          ],
        }),
      },
    })

    expect(wrapper.text()).toContain('FP or DR Modifiers')
    expect(wrapper.text()).toContain('DRM / Cause')

    const link = wrapper.find('a[data-rule-number="A.23.7.1"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('A.23.7.1')
  })

  it('renders modifier footnotes via renderContent', () => {
    const wrapper = mount(IftTable, {
      props: {
        content: makeContent({
          modifiers: [
            {
              label: 'TPBF vs same Location ({{L:A.7.2.1}})',
              value: '×3 †',
              tags: [],
              markers: ['†'],
            },
          ],
          footnotes: { '†': { text: 'EXC: FT NA', style: 'white' } },
        }),
      },
    })

    expect(wrapper.text()).toContain('[†]')
    expect(wrapper.text()).toContain('EXC: FT NA')
  })

  it('highlights the active row and column when hovering a cell', async () => {
    const wrapper = mount(IftTable, { props: { content: makeContent() } })

    const cell = wrapper.find('td[data-row="le0"][data-col="fp1"]')
    await cell.trigger('mouseenter')

    expect(cell.classes()).toContain('bg-primary/15')

    const rowHeader = wrapper.findAll('th').find((t) => t.text() === '≤ 0')
    const colHeader = wrapper.findAll('th').find((t) => t.text() === '1/20')
    expect(rowHeader?.classes()).toContain('bg-primary/25')
    expect(colHeader?.classes()).toContain('bg-primary/25')

    await cell.trigger('mouseleave')
    expect(cell.classes()).not.toContain('bg-primary/15')
  })
})
