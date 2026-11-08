import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FormationTile from '@/components/tools/formation/FormationTile.vue'
import { createScenario } from '@/lib/formations'
import type { Formation } from '@/types/formation'

function makeFormation(): Formation {
  const scenario = createScenario('Test', ['allies:2 Cav Grp'])
  const formation = scenario.formations.find((entry) => entry.name === '2 Cav Grp')
  if (!formation) throw new Error('missing formation')
  formation.preparedDefense = true
  formation.completeMsr = true
  formation.fatigue = 2
  formation.artilleryPoints = 3
  formation.support = '2/37 Arm Bn'
  return formation
}

describe('FormationTile', () => {
  it('shows the compact summary and status chips', () => {
    const wrapper = mount(FormationTile, {
      props: { formation: makeFormation(), selected: false },
    })

    expect(wrapper.text()).toContain('2 Cav Grp')
    expect(wrapper.get('button').attributes('title')).toBe('2 Cav Grp')
    expect(wrapper.text()).toContain('Prep')
    expect(wrapper.text()).toContain('MSR')
    expect(wrapper.text()).toContain('Fat 2')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('2/37 Arm Bn')
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('8 of 8')
  })

  it('marks the tile as selected and pressed', () => {
    const wrapper = mount(FormationTile, {
      props: { formation: makeFormation(), selected: true },
    })

    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('button').classes()).toContain('border-primary/70')
  })

  it('emits select when tapped', async () => {
    const wrapper = mount(FormationTile, {
      props: { formation: makeFormation(), selected: false },
    })

    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false')
    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('hides the fatigue chip when fresh and the no-steps badge while healthy', () => {
    const formation = makeFormation()
    formation.fatigue = 'fresh'
    formation.preparedDefense = false
    formation.artilleryPoints = 0
    formation.support = ''

    const wrapper = mount(FormationTile, {
      props: { formation, selected: false },
    })

    expect(wrapper.text()).not.toContain('Fat')
    expect(wrapper.text()).not.toContain('No steps')
  })
})
