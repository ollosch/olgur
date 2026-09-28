import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
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

import DeleteRuleDialog from '@/components/systems/DeleteRuleDialog.vue'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import type { Module, Rule, System } from '@/types/domain'
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

function seedModule(): ReturnType<typeof useSystemStore> {
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
  return systemStore
}

describe('DeleteRuleDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function mountDialog(rule: Rule, childRules: Rule[] = []) {
    const systemStore = seedModule()
    const contentStore = useContentStore()
    contentStore.rulesByModule['mod1'] = [rule, ...childRules]

    const wrapper = mount(DeleteRuleDialog, {
      props: { open: true, rule },
      global: { stubs: dialogStubs() },
    })

    return { wrapper, contentStore, systemStore }
  }

  it('offers re-parent and recursive modes when the rule has children', () => {
    const rule = makeRule({ id: 'r1', module_id: 'mod1' })
    const child = makeRule({ id: 'r2', module_id: 'mod1', parent_id: 'r1' })
    const { wrapper } = mountDialog(rule, [child])

    expect(wrapper.find('input[value="re_parent"]').exists()).toBe(true)
    expect(wrapper.find('input[value="recursive"]').exists()).toBe(true)
  })

  it('hides the mode choice when the rule has no children', () => {
    const rule = makeRule({ id: 'r1', module_id: 'mod1' })
    const { wrapper } = mountDialog(rule)

    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)
  })

  it('deletes with the default re_parent mode and emits deleted', async () => {
    const rule = makeRule({ id: 'r1', module_id: 'mod1' })
    const child = makeRule({ id: 'r2', module_id: 'mod1', parent_id: 'r1' })
    const { wrapper, contentStore } = mountDialog(rule, [child])
    const deleteRule = vi.spyOn(contentStore, 'deleteRule').mockResolvedValue({ ok: true, data: undefined })

    const deleteButton = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'Delete')
    await deleteButton!.trigger('click')

    expect(deleteRule).toHaveBeenCalledWith('sys1', rule, 're_parent')
    expect(wrapper.emitted('deleted')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toContainEqual([false])
  })

  it('deletes recursively when that mode is selected', async () => {
    const rule = makeRule({ id: 'r1', module_id: 'mod1' })
    const child = makeRule({ id: 'r2', module_id: 'mod1', parent_id: 'r1' })
    const { wrapper, contentStore } = mountDialog(rule, [child])
    const deleteRule = vi.spyOn(contentStore, 'deleteRule').mockResolvedValue({ ok: true, data: undefined })

    await wrapper.find('input[value="recursive"]').setValue()
    const deleteButton = wrapper
      .findAll('button')
      .find((b) => b.text().trim() === 'Delete')
    await deleteButton!.trigger('click')

    expect(deleteRule).toHaveBeenCalledWith('sys1', rule, 'recursive')
  })
})
