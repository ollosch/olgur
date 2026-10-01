import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CctTable from '@/components/game-data/CctTable.vue'
import type { CctContent } from '@/components/game-data/CctTable.vue'

function makeContent(overrides: Partial<CctContent> = {}): CctContent {
  return {
    kind: 'cct',
    columns: [
      { id: 'lt_1_8', odds: '< 1-8' },
      { id: '1_1', odds: '1-1' },
    ],
    kill_numbers: {
      lt_1_8: { black: 0, red: 2 },
      '1_1': { black: 5, red: 7 },
    },
    ...overrides,
  }
}

describe('CctTable', () => {
  it('renders the odds ratio header row', () => {
    const wrapper = mount(CctTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('Odds Ratio')
    expect(wrapper.text()).toContain('< 1-8')
    expect(wrapper.text()).toContain('1-1')
  })

  it('renders black and red kill numbers', () => {
    const wrapper = mount(CctTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('Kill Number')

    const redSpans = wrapper.findAll('span.text-red-500')
    expect(redSpans).toHaveLength(2)
    expect(redSpans[0]?.text()).toBe('2')
    expect(redSpans[1]?.text()).toBe('7')
  })

  it('renders a rule link from a {{L:...}} token in notes', () => {
    const wrapper = mount(CctTable, {
      props: { content: makeContent({ notes: ['See {{L:A.11.5.1}} for details'] }) },
    })

    const link = wrapper.find('a[data-rule-number="A.11.5.1"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('A.11.5.1')
  })
})
