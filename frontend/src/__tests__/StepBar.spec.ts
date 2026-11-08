import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StepBar from '@/components/tools/formation/StepBar.vue'

describe('StepBar', () => {
  it('keeps a single row up to 30 steps', () => {
    const wrapper = mount(StepBar, { props: { steps: 30, startingSteps: 30 } })

    expect(wrapper.findAll('[data-step-row]')).toHaveLength(1)
    expect(wrapper.findAll('[data-step-row]')[0]?.findAll('span')).toHaveLength(30)
  })

  it('splits larger formations into evenly sized rows', () => {
    const wrapper = mount(StepBar, { props: { steps: 65, startingSteps: 65 } })
    const rows = wrapper.findAll('[data-step-row]')

    expect(rows).toHaveLength(3)
    expect(rows[0]?.findAll('span')).toHaveLength(22)
    expect(rows[1]?.findAll('span')).toHaveLength(22)
    expect(rows[2]?.findAll('span')).toHaveLength(21)
  })

  it('splits 40 steps into two rows of 20', () => {
    const wrapper = mount(StepBar, { props: { steps: 40, startingSteps: 40 } })
    const rows = wrapper.findAll('[data-step-row]')

    expect(rows).toHaveLength(2)
    expect(rows[0]?.findAll('span')).toHaveLength(20)
    expect(rows[1]?.findAll('span')).toHaveLength(20)
  })

  it('colors each segment like its unit step bar', () => {
    const wrapper = mount(StepBar, {
      props: {
        steps: 6,
        startingSteps: 8,
        segments: [
          { steps: 4, startingSteps: 4 },
          { steps: 2, startingSteps: 4 },
        ],
      },
    })
    const pips = wrapper.findAll('[data-step-row] span')

    expect(pips).toHaveLength(8)
    expect(pips[0]?.classes()).toContain('bg-primary')
    expect(pips[4]?.classes()).toContain('bg-amber-500')
    expect(pips[6]?.classes()).toContain('bg-muted-foreground/15')
  })
})
