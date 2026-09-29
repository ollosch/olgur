import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDel = vi.fn()
const mockPatch = vi.fn()
const mockLoading = ref(false)

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    del: mockDel,
    patch: mockPatch,
    loading: mockLoading,
  })),
}))

vi.mock('@/components/ui/input', () => ({
  Input: defineComponent({
    name: 'InputStub',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" v-bind="$attrs" />',
  }),
}))

import ReleaseVersionDialog from '@/components/systems/ReleaseVersionDialog.vue'
import { useSystemStore } from '@/stores/system'
import { dialogStubs } from './helpers/dialogStubs'

describe('ReleaseVersionDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('releases a version and closes on success', async () => {
    const systemStore = useSystemStore()
    const createVersion = vi
      .spyOn(systemStore, 'createVersion')
      .mockResolvedValue({ ok: true, data: undefined })

    const wrapper = mount(ReleaseVersionDialog, {
      props: { systemId: 'sys1', moduleId: 'mod1', moduleName: 'Core', open: true },
      global: { stubs: dialogStubs() },
    })

    await wrapper.find('#ver-string').setValue('0.1')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createVersion).toHaveBeenCalledWith('sys1', 'mod1', '0.1')
    expect(wrapper.emitted('update:open')).toContainEqual([false])
  })
})
