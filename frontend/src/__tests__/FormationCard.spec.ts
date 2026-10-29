import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FormationCard from '@/components/tools/formation/FormationCard.vue'
import { createScenario } from '@/lib/formations'
import { useFormationManagerStore } from '@/stores/formationManager'

describe('FormationCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountCard(): ReturnType<typeof mount> {
    const store = useFormationManagerStore()
    const scenario = createScenario('Test', ['allies:2 Cav Grp'])
    store.current = scenario

    const formation = scenario.formations.find((entry) => entry.name === '2 Cav Grp')
    if (!formation) throw new Error('missing formation')

    return mount(FormationCard, {
      props: { formation, expanded: true },
    })
  }

  it('shows unit steps and adjusts them with touch-sized buttons', async () => {
    const wrapper = mountCard()
    const firstUnit = wrapper.find('[data-formation-id="allies:2 Cav Grp"]')

    expect(firstUnit.text()).toContain('2 Arm Cav Bn')
    expect(wrapper.text()).toMatch(/8\s*\/\s*8/)

    await wrapper.get('[aria-label="Remove one step from 2 Arm Cav Bn"]').trigger('click')

    expect(useFormationManagerStore().current?.formations[0]?.units[0]?.steps).toBe(3)
    expect(wrapper.text()).toMatch(/7\s*\/\s*8/)
  })

  it('sets fatigue, support, artillery, and prepared defense', async () => {
    const wrapper = mountCard()
    const store = useFormationManagerStore()

    await wrapper.get('[aria-label="Fatigue 3"]').trigger('click')
    expect(store.current?.formations[0]?.fatigue).toBe(3)

    await wrapper.get('[aria-label="Add one artillery point"]').trigger('click')
    expect(store.current?.formations[0]?.artilleryPoints).toBe(1)

    await wrapper.get('input[aria-label="Assigned support"]').setValue('2/37 Arm Bn')
    expect(store.current?.formations[0]?.support).toBe('2/37 Arm Bn')

    const prepared = wrapper.findAll('button').find((button) =>
      button.text().includes('Prepared Defense'),
    )
    await prepared?.trigger('click')
    expect(store.current?.formations[0]?.preparedDefense).toBe(true)
  })

  it('sends a formation to the Dead Pool and warns when it has no steps', async () => {
    const wrapper = mountCard()
    const store = useFormationManagerStore()
    const formation = store.current?.formations[0]
    if (!formation) throw new Error('missing formation')

    for (const unit of formation.units) {
      store.setUnitSteps(formation.id, unit.id, 0)
    }
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('No steps')
    expect(wrapper.text()).toContain('Send it to the Dead Pool')

    const send = wrapper.findAll('button').find((button) =>
      button.text().includes('Send to Dead Pool'),
    )
    await send?.trigger('click')
    expect(formation.status).toBe('dead_pool')
  })

  it('emits toggle when the summary is tapped', async () => {
    const wrapper = mountCard()
    await wrapper.get('[aria-expanded="true"]').trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })
})
