import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mock useApi for all stores that import it ────────────────────────────────
const mockGet = vi.fn()
const mockPut = vi.fn()
const mockDel = vi.fn()
const mockPatch = vi.fn()
const mockLoading = ref(false)

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    put: mockPut,
    del: mockDel,
    patch: mockPatch,
    loading: mockLoading,
  })),
}))

import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import type { BrokenReference, Module, Rule, System } from '@/types/domain'

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
    draft_revision: 0,
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

function makeRule(overrides: Partial<Rule> & { id: string; module_id: string }): Rule {
  return {
    number: overrides.id,
    title: 'Rule',
    content: '',
    sort_order: 0,
    parent_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function seedCoreModule(systemStore: ReturnType<typeof useSystemStore>): void {
  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule('mod1')]
}

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

describe('content store rule actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPut.mockReset()
    mockDel.mockReset()
    mockPatch.mockReset()
  })

  describe('deleteRule', () => {
    it('re_parents direct children when deleting in re_parent mode', async () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()
      seedCoreModule(systemStore)

      const rule = makeRule({ id: 'r1', module_id: 'mod1', parent_id: null })
      const child = makeRule({ id: 'r2', module_id: 'mod1', parent_id: 'r1' })
      contentStore.rulesByModule['mod1'] = [rule, child]
      mockDel.mockResolvedValue({ ok: true, data: undefined })

      const result = await contentStore.deleteRule('sys1', rule, 're_parent')

      expect(mockDel).toHaveBeenCalledWith(
        '/systems/sys1/modules/mod1/rules/r1',
        { mode: 're_parent' },
      )
      expect(result.ok).toBe(true)
      expect(contentStore.rulesByModule['mod1'].map((r) => r.id)).toEqual(['r2'])
      expect(contentStore.rulesByModule['mod1'][0]?.parent_id).toBeNull()
    })

    it('removes the whole subtree in recursive mode', async () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()
      seedCoreModule(systemStore)

      const rule = makeRule({ id: 'r1', module_id: 'mod1', parent_id: null })
      const child = makeRule({ id: 'r2', module_id: 'mod1', parent_id: 'r1' })
      const grandchild = makeRule({ id: 'r3', module_id: 'mod1', parent_id: 'r2' })
      contentStore.rulesByModule['mod1'] = [rule, child, grandchild]
      mockDel.mockResolvedValue({ ok: true, data: undefined })

      await contentStore.deleteRule('sys1', rule, 'recursive')

      expect(mockDel).toHaveBeenCalledWith(
        '/systems/sys1/modules/mod1/rules/r1',
        { mode: 'recursive' },
      )
      expect(contentStore.rulesByModule['mod1']).toEqual([])
    })
  })

  describe('fetchLint', () => {
    it('returns the broken reference list', async () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()
      seedCoreModule(systemStore)

      const broken = makeBrokenReference()
      mockGet.mockResolvedValue({ ok: true, data: { data: [broken] } })

      const result = await contentStore.fetchLint('sys1')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/lint')
      expect(result).toEqual({ ok: true, data: [broken] })
    })
  })
})
