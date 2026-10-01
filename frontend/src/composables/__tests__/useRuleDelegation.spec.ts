import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock useApi for all stores that import it ────────────────────────────────
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

import { useRuleDelegation } from '@/composables/useRuleDelegation'
import { useInteractionStore } from '@/stores/interaction'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import type { Rule, Module, System } from '@/types/domain'

function makeSystem(id: string): System {
  return {
    id,
    slug: id,
    name: `System ${id}`,
    description: null,
    config: {
      global_rule_numbers: true,
      sort_rules_by: 'number',
      toc_depth: 3,
      proofread_threshold: 3,
      cover_image: null,
    },
    permissions: { 'system.manage': false, 'membership.manage': false, 'module.create': false },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeModule(id: string): Module {
  return {
    id,
    system_id: 'sys1',
    slug: id,
    name: `Module ${id}`,
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
}

const rule: Rule = {
  id: 'rule-1',
  module_id: 'mod1',
  parent_id: null,
  number: '1.1',
  title: 'Rule one',
  content: 'Content',
  markdown: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function mountDelegation(onSelect = vi.fn()) {
  const pinia = createPinia()
  setActivePinia(pinia)

  const systemStore = useSystemStore()
  const contentStore = useContentStore()

  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule('mod1')]
  contentStore.rulesByModule['mod1'] = [rule]

  mount(
    defineComponent({
      setup() {
        useRuleDelegation(onSelect)
        return () => h('div')
      },
    }),
    { attachTo: document.body, global: { plugins: [pinia] } },
  )

  return { onSelect, interactionStore: useInteractionStore() }
}

describe('useRuleDelegation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.replaceChildren()
  })

  it('does not show hover popups on devices without hover support', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    const { onSelect, interactionStore } = mountDelegation()
    const link = document.createElement('a')
    link.dataset['ruleNumber'] = rule.number
    document.body.append(link)

    link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    link.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    vi.advanceTimersByTime(150)

    expect(onSelect).toHaveBeenCalledWith(rule)
    expect(interactionStore.popupState.visible).toBe(false)
  })

  it('shows hover popups on devices with hover support', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const { interactionStore } = mountDelegation()
    const link = document.createElement('a')
    link.dataset['ruleNumber'] = rule.number
    document.body.append(link)

    link.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    vi.advanceTimersByTime(150)

    expect(interactionStore.popupState.visible).toBe(true)
  })
})
