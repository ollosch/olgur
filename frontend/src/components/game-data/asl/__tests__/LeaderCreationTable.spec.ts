import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LeaderCreationTable from '@/components/game-data/asl/LeaderCreationTable.vue'
import type { LeaderCreationContent } from '@/components/game-data/asl/LeaderCreationTable.vue'

function makeContent(overrides: Partial<LeaderCreationContent> = {}): LeaderCreationContent {
  return {
    kind: 'leader_creation',
    note: 'dr follows Original 2 on the first MMC Self-Rally or any MMC CC',
    rows: [
      { id: 'ge7', label: '≥ 7', leader: 'None' },
      { id: 'dr6', label: '6', leader: '6+1' },
    ],
    ...overrides,
  }
}

describe('LeaderCreationTable', () => {
  it('renders the note line', () => {
    const wrapper = mount(LeaderCreationTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('dr follows Original 2')
  })

  it('renders the dr → leader lookup rows', () => {
    const wrapper = mount(LeaderCreationTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('dr')
    expect(wrapper.text()).toContain('Leader')
    expect(wrapper.text()).toContain('≥ 7')
    expect(wrapper.text()).toContain('None')
    expect(wrapper.text()).toContain('6')
    expect(wrapper.text()).toContain('6+1')
  })

  it('renders a modifier with a {{L:...}} link and a data-rule-number element', () => {
    const wrapper = mount(LeaderCreationTable, {
      props: {
        content: makeContent({
          modifiers: [
            {
              label: 'vs AFT, or per odds column ({{L:A.18.2}})',
              value: '-1',
              tags: [],
              markers: [],
            },
          ],
        }),
      },
    })

    expect(wrapper.text()).toContain('DRM')
    expect(wrapper.text()).toContain('Cause')
    expect(wrapper.text()).toContain('drm')

    const link = wrapper.find('a[data-rule-number="A.18.2"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('A.18.2')
  })
})
