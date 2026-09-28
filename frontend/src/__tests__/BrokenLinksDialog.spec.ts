import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
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

import BrokenLinksDialog from '@/components/systems/BrokenLinksDialog.vue'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import type { BrokenReference, Module, System } from '@/types/domain'
import { dialogStubs } from './helpers/dialogStubs'

function makeBrokenReference(overrides: Partial<BrokenReference> = {}): BrokenReference {
  return {
    module: 'core',
    location: '1.1',
    kind: 'rule',
    reference: '{{L:9.9}}',
    reason: 'unknown_number',
    ...overrides,
  }
}

function seedSystem(): void {
  const systemStore = useSystemStore()
  const system: System = {
    id: 'sys1',
    slug: 'sys1',
    name: 'System',
    description: null,
    config: null,
    permissions: { 'system.manage': true, 'membership.manage': false, 'module.create': false },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
  const module: Module = {
    id: 'mod1',
    system_id: 'sys1',
    slug: 'core',
    name: 'Core',
    description: null,
    config: null,
    is_core: true,
    sort_order: 0,
    permissions: {
      'module.update': false,
      'module.delete': false,
      'content.view_live': true,
      'content.view_released': false,
      'content.edit': false,
      'content.proofread': false,
      'version.publish': false,
      'version.amend_latest': false,
      'subscription.manage': false,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
  systemStore.currentSystem = system
  systemStore.modulesBySystem['sys1'] = [module]
}

describe('BrokenLinksDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function mountDialog() {
    seedSystem()
    const contentStore = useContentStore()

    const wrapper = mount(BrokenLinksDialog, {
      props: { open: false },
      global: { stubs: dialogStubs() },
    })

    return { wrapper, contentStore }
  }

  it('fetches and renders broken references when opened', async () => {
    const { wrapper, contentStore } = mountDialog()

    const broken = makeBrokenReference()
    const fetchLint = vi.spyOn(contentStore, 'fetchLint').mockResolvedValue({ ok: true, data: [broken] })

    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(fetchLint).toHaveBeenCalledWith('sys1')
    expect(wrapper.text()).toContain('{{L:9.9}}')
    expect(wrapper.text()).toContain('unknown_number')
  })

  it('shows an empty state when there are no broken links', async () => {
    const { wrapper, contentStore } = mountDialog()

    vi.spyOn(contentStore, 'fetchLint').mockResolvedValue({ ok: true, data: [] })

    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(wrapper.text()).toContain('No broken links found.')
  })
})
