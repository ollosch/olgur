import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ModifierList from '@/components/game-data/ModifierList.vue'
import type { ModifierListContent } from '@/components/game-data/ModifierList.vue'

function makeContent(overrides: Partial<ModifierListContent> = {}): ModifierListContent {
  return {
    kind: 'modifier_list',
    columns: ['DRM', 'Modifier'],
    entries: [],
    ...overrides,
  }
}

describe('ModifierList', () => {
  it('renders a rule link from a {{L:...}} token in an entry label', () => {
    const content = makeContent({
      entries: [{ label: 'See {{L:C.3.7.1}} for details', value: '+1', tags: [], markers: [] }],
    })

    const wrapper = mount(ModifierList, { props: { content } })

    const link = wrapper.find('a[data-rule-number="C.3.7.1"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('C.3.7.1')
  })

  it('renders label and value for entries carrying machine-only effect fields', () => {
    const content = makeContent({
      entries: [
        {
          label: 'Halved firepower',
          value: '×1/2',
          tags: [],
          markers: [],
          effect_type: 'fp_multiplier',
          effect_value: 0.5,
        },
      ],
    })

    const wrapper = mount(ModifierList, { props: { content } })

    expect(wrapper.text()).toContain('Halved firepower')
    expect(wrapper.text()).toContain('×1/2')
    expect(wrapper.html()).not.toContain('effect_type')
    expect(wrapper.html()).not.toContain('fp_multiplier')
  })
})
