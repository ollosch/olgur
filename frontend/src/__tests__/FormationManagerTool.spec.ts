import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FormationManagerTool from '@/components/tools/FormationManagerTool.vue'
import { createScenario } from '@/lib/formations'
import { useFormationManagerStore } from '@/stores/formationManager'

describe('FormationManagerTool', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns focus to the selected tile when the detail panel is closed', async () => {
    const store = useFormationManagerStore()
    const scenario = createScenario('Test', ['allies:2 Cav Grp'])
    store.current = scenario
    store.ready = true

    const formation = scenario.formations.find((entry) => entry.name === '2 Cav Grp')
    if (!formation) throw new Error('missing formation')
    store.selectFormation(formation.id)

    const wrapper = mount(FormationManagerTool, { attachTo: document.body })
    await flushPromises()

    await wrapper.get('[aria-label="Close details"]').trigger('click')
    await flushPromises()

    expect(document.activeElement).toBe(
      wrapper.get(`button[data-formation-id="${formation.id}"]`).element,
    )

    wrapper.unmount()
  })
  it('shows both side lists and swaps the opposite side to the detail view', async () => {
    const store = useFormationManagerStore()
    const scenario = createScenario('Test', ['allies:2 Cav Grp', 'germans:11 Pz Div'])
    store.current = scenario
    store.ready = true

    const wrapper = mount(FormationManagerTool, { attachTo: document.body })
    await flushPromises()

    expect(wrapper.text()).toContain('Allies')
    expect(wrapper.text()).toContain('Germans')
    expect(wrapper.text()).toContain('11 Pz Div')

    await wrapper.get('button[data-formation-id="allies:2 Cav Grp"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Prepared Defense')
    expect(wrapper.text()).not.toContain('11 Pz Div')

    await wrapper.get('[aria-label="Close details"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('11 Pz Div')

    wrapper.unmount()
  })

})
