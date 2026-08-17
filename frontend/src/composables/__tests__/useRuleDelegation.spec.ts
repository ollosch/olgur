import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuleDelegation } from '@/composables/useRuleDelegation'
import { useInteractionStore } from '@/stores/interaction'
import type { Rule } from '@/types/domain'

const rule: Rule = {
  id: 'rule-1',
  module_id: 'module-1',
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

  mount(
    defineComponent({
      setup() {
        useRuleDelegation(() => new Map([[rule.number, rule]]), onSelect)
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
