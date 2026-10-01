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
})
