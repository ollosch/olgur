import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FormationTile from '@/components/tools/formation/FormationTile.vue'
import { createScenario } from '@/lib/formations'
import { useFormationManagerStore } from '@/stores/formationManager'
import type { Formation } from '@/types/formation'

function makeFormation(): Formation {
  const scenario = createScenario('Test', ['allies:2 Cav Grp'])
  const store = useFormationManagerStore()
  store.current = scenario
  const formation = scenario.formations.find((entry) => entry.name === '2 Cav Grp')
  if (!formation) throw new Error('missing formation')
  formation.preparedDefense = true
  formation.completeMsr = true
  formation.fatigue = 2
  formation.artilleryPoints = 3
  formation.support = ['2 Arm Cav Bn', '2/320 Inf Bn']
  return formation
}

describe('FormationTile', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows the compact summary and status chips', () => {
    const wrapper = mount(FormationTile, {
      props: { formation: makeFormation(), selected: false },
    })

    expect(wrapper.text()).toContain('2 Cav Grp')
    expect(wrapper.get('button').attributes('title')).toBe('2 Cav Grp')
    expect(wrapper.text()).toContain('PD')
    expect(wrapper.text()).toContain('MSR')
    expect(wrapper.text()).toContain('Fat 2')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('2 Arm Cav Bn')
    expect(wrapper.text()).toContain('2/320 Inf Bn')
    expect(wrapper.findAll('[data-support-dots]')).toHaveLength(2)
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toContain('8 of 8')
  })

  it('drops the border when the formation is done', () => {
    const formation = makeFormation()
    formation.done = true

    const wrapper = mount(FormationTile, {
      props: { formation, selected: false },
    })

    expect(wrapper.text()).not.toContain('Done')
    expect(wrapper.get('button').classes()).toContain('border-transparent')
    expect(wrapper.get('button').classes()).toContain('brightness-90')
  })

  it('keeps a border while the formation is not done', () => {
    const wrapper = mount(FormationTile, {
      props: { formation: makeFormation(), selected: false },
    })

    expect(wrapper.get('button').classes()).toContain('border-muted-foreground/70')
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

  it('shows a Fresh pill and the no-steps badge while healthy', () => {
    const formation = makeFormation()
    formation.fatigue = 'fresh'
    formation.preparedDefense = false
    formation.artilleryPoints = 0
    formation.support = []

    const wrapper = mount(FormationTile, {
      props: { formation, selected: false },
    })

    expect(wrapper.text()).toContain('Fresh')
    expect(wrapper.text()).not.toContain('No steps')
  })
})
