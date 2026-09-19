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

import RenumberRuleDialog from '@/components/systems/RenumberRuleDialog.vue'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import type { Module, RenumberPreview, Rule, System } from '@/types/domain'
import { dialogStubs } from './helpers/dialogStubs'

function makeRule(overrides: Partial<Rule> & { id: string; module_id: string }): Rule {
  return {
    number: overrides.id,
    title: 'Rule',
    content: '',
    markdown: null,
    sort_order: 0,
    parent_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function seedModule(): void {
  const systemStore = useSystemStore()
  const system: System = {
    id: 'sys1',
    slug: 'sys1',
    name: 'System',
    description: null,
    config: null,
    permissions: { 'system.manage': false, 'membership.manage': false, 'module.create': false },
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
      'content.edit': true,
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

function makePreview(): RenumberPreview {
  return {
    rule: { id: 'r1', number: '1.2', new_number: '9.9' },
    affected_rules: [{ id: 'r2', number: '2.0', title: 'References the rule' }],
    affected_index_entries: [{ id: 'e1', term: 'Alpha' }],
  }
}

describe('RenumberRuleDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function mountDialog(rule: Rule) {
    seedModule()
    const contentStore = useContentStore()

    const wrapper = mount(RenumberRuleDialog, {
      props: { open: true, rule },
      global: { stubs: dialogStubs() },
    })

    return { wrapper, contentStore }
  }

  it('previews affected references before confirming', async () => {
    const rule = makeRule({ id: 'r1', module_id: 'mod1', number: '1.2' })
    const { wrapper, contentStore } = mountDialog(rule)

    const preview = makePreview()
    const previewRenumber = vi
      .spyOn(contentStore, 'previewRenumber')
      .mockResolvedValue({ ok: true, data: preview })

    await wrapper.find('input').setValue('9.9')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(previewRenumber).toHaveBeenCalledWith('sys1', rule, '9.9')
    expect(wrapper.text()).toContain('2.0')
    expect(wrapper.text()).toContain('References the rule')
    expect(wrapper.text()).toContain('Alpha')
  })

  it('confirms the renumber and closes the dialog', async () => {
    const rule = makeRule({ id: 'r1', module_id: 'mod1', number: '1.2' })
    const { wrapper, contentStore } = mountDialog(rule)

    vi.spyOn(contentStore, 'previewRenumber').mockResolvedValue({ ok: true, data: makePreview() })
    const confirmRenumber = vi
      .spyOn(contentStore, 'confirmRenumber')
      .mockResolvedValue({ ok: true, data: { ...rule, number: '9.9' } })

    await wrapper.find('input').setValue('9.9')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const confirmButton = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'Confirm renumber')
    await confirmButton!.trigger('click')
    await flushPromises()

    expect(confirmRenumber).toHaveBeenCalledWith('sys1', rule, '9.9')
    expect(wrapper.emitted('update:open')).toContainEqual([false])
  })

  it('surfaces a validation error on a rejected number', async () => {
    const rule = makeRule({ id: 'r1', module_id: 'mod1', number: '1.2' })
    const { wrapper, contentStore } = mountDialog(rule)

    vi.spyOn(contentStore, 'previewRenumber').mockResolvedValue({
      ok: false,
      errors: { number: 'This rule number already exists in another module of this system.' },
    })

    await wrapper.find('input').setValue('9.9')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('This rule number already exists in another module of this system.')
  })
})
