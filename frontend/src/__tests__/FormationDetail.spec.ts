import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FormationDetail from '@/components/tools/formation/FormationDetail.vue'
import { createScenario } from '@/lib/formations'
import { useFormationManagerStore } from '@/stores/formationManager'

describe('FormationDetail', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountDetail(): ReturnType<typeof mount> {
    const store = useFormationManagerStore()
    const scenario = createScenario('Test', ['allies:2 Cav Grp'])
    store.current = scenario

    const formation = scenario.formations.find((entry) => entry.name === '2 Cav Grp')
    if (!formation) throw new Error('missing formation')

    return mount(FormationDetail, {
      props: { formation },
    })
  }

  it('shows unit steps and adjusts them with touch-sized buttons', async () => {
    const wrapper = mountDetail()
    const firstUnit = wrapper.find('[data-formation-id="allies:2 Cav Grp"]')

    expect(firstUnit.text()).toContain('2 Arm Cav Bn')
    expect(wrapper.text()).toMatch(/8\s*\/\s*8/)

    await wrapper.get('[aria-label="Remove one step from 2 Arm Cav Bn"]').trigger('click')

    expect(useFormationManagerStore().current?.formations[0]?.units[0]?.steps).toBe(3)
    expect(wrapper.text()).toMatch(/7\s*\/\s*8/)
  })

  it('sets fatigue, support, artillery, and prepared defense', async () => {
    const wrapper = mountDetail()
    const store = useFormationManagerStore()

    for (let step = 0; step < 4; step++) {
      await wrapper.get('[aria-label="Increase fatigue"]').trigger('click')
    }
    expect(store.current?.formations[0]?.fatigue).toBe(3)

    await wrapper.get('[aria-label="Add one artillery point"]').trigger('click')
    expect(store.current?.formations[0]?.artilleryPoints).toBe(1)

    await wrapper.get('[aria-label="Assigned support"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[aria-label="Select support 2 Arm Cav Bn"]')?.click()
    await flushPromises()
    expect(store.current?.formations[0]?.support).toBe('2 Arm Cav Bn')

    await wrapper.get('[aria-label="Prepared Defense"]').trigger('click')
    expect(store.current?.formations[0]?.preparedDefense).toBe(true)

    await wrapper.get('[aria-label="Complete MSR"]').trigger('click')
    expect(store.current?.formations[0]?.completeMsr).toBe(true)
  })

  it('sends a formation to the Dead Pool and warns when it has no steps', async () => {
    const wrapper = mountDetail()
    const store = useFormationManagerStore()
    const formation = store.current?.formations[0]
    if (!formation) throw new Error('missing formation')

    for (const unit of formation.units) {
      store.setUnitSteps(formation.id, unit.id, 0)
    }
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('no steps left')
    expect(wrapper.text()).toContain('Send it to the Dead Pool')

    const send = wrapper.findAll('button').find((button) =>
      button.text().includes('Send to Dead Pool'),
    )
    await send?.trigger('click')
    expect(formation.status).toBe('dead_pool')
  })

  it('assigns an independent unit as support and clears it', async () => {
    const wrapper = mountDetail()
    const store = useFormationManagerStore()

    await wrapper.get('[aria-label="Assigned support"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[aria-label="Select support 2/320 Inf Bn"]')?.click()
    await flushPromises()
    expect(store.current?.formations[0]?.support).toBe('2/320 Inf Bn')

    await wrapper.get('[aria-label="Assigned support"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[aria-label="Clear support"]')?.click()
    await flushPromises()
    expect(store.current?.formations[0]?.support).toBe('')
  })

  it('chooses fatigue and artillery points from popup pickers', async () => {
    const wrapper = mountDetail()
    const store = useFormationManagerStore()

    await wrapper.get('[aria-label="Choose fatigue"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[aria-label="Select Fatigue 4"]')?.click()
    await flushPromises()
    expect(store.current?.formations[0]?.fatigue).toBe(4)

    await wrapper.get('[aria-label="Choose artillery points"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLButtonElement>('[aria-label="Select 5"]')?.click()
    await flushPromises()
    expect(store.current?.formations[0]?.artilleryPoints).toBe(5)
  })

  it('emits close from the header button', async () => {
    const wrapper = mountDetail()
    await wrapper.get('[aria-label="Close details"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
