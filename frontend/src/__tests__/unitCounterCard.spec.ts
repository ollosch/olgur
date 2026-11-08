import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UnitCounterCard from '@/components/layout/UnitCounterCard.vue'
import type { GameDatum } from '@/types/domain'

function makeUnit(type: GameDatum['type'], content: Record<string, unknown>): GameDatum {
  return {
    id: 'u1',
    module_id: 'mod1',
    type,
    slug: 'u1',
    name: type === 'vehicle' ? 'PzKpfw IVH' : '8cm GrW 34',
    content,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

describe('UnitCounterCard', () => {
  it('renders vehicle movement, armor, gun and MG values', () => {
    const wrapper = mount(UnitCounterCard, {
      props: {
        unit: makeUnit('vehicle', {
          nation: 'german',
          type: 'MT',
          af: '8/3',
          ta: '-F/+SR',
          mp: '13',
          ma: '75L',
          rof: '1',
          b: '0',
          bmg: '3',
          cmg: '5',
          aamg: 'Opt2',
          gt: 'T',
        }),
      },
    })

    expect(wrapper.find('[data-test="unit-counter"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('13')
    expect(wrapper.text()).toContain('8')
    expect(wrapper.text()).toContain('75')
    expect(wrapper.text()).toContain('3/5/Opt2')
    expect(wrapper.text()).toContain('PzKpfw IVH')
  })

  it('renders ordnance caliber decoration, ROF, range and special tags', () => {
    const wrapper = mount(UnitCounterCard, {
      props: {
        unit: makeUnit('ordnance', {
          nation: 'german',
          type: 'MTR',
          csize: "<span style='text-decoration:overline'>81*</span>",
          rof: '3',
          range: '2-60',
          special: '5PP',
          dates: '36-45',
        }),
      },
    })

    expect(wrapper.find('[data-test="unit-counter"]').exists()).toBe(true)
    expect(wrapper.find('.overline').exists()).toBe(true)
    expect(wrapper.text()).toContain('81')
    expect(wrapper.text()).toContain('[2-60]')
    expect(wrapper.text()).toContain('5PP')
    expect(wrapper.text()).toContain('36-45')
  })

  it('shows the manhandling number for a gun', () => {
    const wrapper = mount(UnitCounterCard, {
      props: {
        unit: makeUnit('ordnance', {
          nation: 'german',
          type: 'AT',
          csize: '88LL',
          rof: '2',
          m: '<b>10</b>',
          range: '20',
          tsize: '+1',
        }),
      },
    })

    expect(wrapper.text()).toContain('M10')
  })
})
