import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'

// ─── Mock useApi for all stores that import it ────────────────────────────────
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDel = vi.fn()
const mockLoading = ref(false)
const featureState = vi.hoisted(() => ({ aslTables: true, afvVsAfv: true }))

vi.mock('@/lib/features', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/features')>()
  return { ...actual, FEATURES: featureState }
})

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    post: mockPost,
    del: mockDel,
    put: vi.fn(),
    patch: vi.fn(),
    loading: mockLoading,
  })),
}))

import { useProofreadStore } from '@/stores/proofread'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import RuleDetailChildren from '@/components/systems/RuleDetailChildren.vue'
import ProofreadToggle from '@/components/systems/ProofreadToggle.vue'
import type { System, Module, Rule, IndexEntry, GameDatum } from '@/types/domain'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function makeModule(id: string, proofread: boolean): Module {
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
      'content.proofread': proofread,
      'version.publish': false,
      'version.amend_latest': false,
      'subscription.manage': false,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeRule(id: string): Rule {
  return {
    id,
    module_id: 'mod1',
    parent_id: null,
    number: `1.${id}`,
    title: `Rule ${id}`,
    content: '',
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeIndexEntry(id: string): IndexEntry {
  return {
    id,
    module_id: 'mod1',
    parent_id: null,
    term: `Term ${id}`,
    definition: 'Definition.',
    notes: null,
    relations: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeGameDatum(id: string, content: Record<string, unknown> = {}): GameDatum {
  return {
    id,
    module_id: 'mod1',
    type: 'table',
    slug: id,
    name: `Table ${id}`,
    content,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function seedSystem(proofread = true): void {
  const systemStore = useSystemStore()
  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule('mod1', proofread)]
}

// ─── Store tests ──────────────────────────────────────────────────────────────

describe('useProofreadStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    featureState.aslTables = true
    featureState.afvVsAfv = true
    mockGet.mockReset()
    mockPost.mockReset()
    mockDel.mockReset()
  })

  describe('fetchStatus', () => {
    it('parses the threshold and status map from the response', async () => {
      seedSystem()
      const proofreadStore = useProofreadStore()
      mockGet.mockResolvedValue({
        ok: true,
        data: {
          data: {
            threshold: 5,
            proofreads: { r1: { count: 2, me: true } },
          },
        },
      })

      await proofreadStore.fetchStatus('sys1')

      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/proofreads')
      expect(proofreadStore.threshold).toBe(5)
      expect(proofreadStore.statusMap['r1']).toEqual({ count: 2, me: true })
    })
  })

  describe('isDone', () => {
    it('is true when the count meets the threshold', () => {
      seedSystem()
      const proofreadStore = useProofreadStore()
      proofreadStore.threshold = 3
      proofreadStore.statusMap = { r1: { count: 3, me: false } }

      expect(proofreadStore.isDone('r1')).toBe(true)
    })

    it('is false when the count is below the threshold', () => {
      seedSystem()
      const proofreadStore = useProofreadStore()
      proofreadStore.threshold = 3
      proofreadStore.statusMap = { r1: { count: 2, me: false } }

      expect(proofreadStore.isDone('r1')).toBe(false)
    })
  })

  describe('needsProofreading', () => {
    it('lists rules, index entries and game data below the threshold', () => {
      seedSystem()
      const proofreadStore = useProofreadStore()
      const contentStore = useContentStore()

      proofreadStore.threshold = 3
      proofreadStore.statusMap = {
        r1: { count: 1, me: false },
        r2: { count: 3, me: false },
        gd1: { count: 0, me: false },
      }
      contentStore.rulesByModule['mod1'] = [makeRule('r1'), makeRule('r2')]
      contentStore.indexEntriesByModule['mod1'] = [makeIndexEntry('e1')]
      contentStore.gameDataByModule['mod1'] = [makeGameDatum('gd1')]

      const entries = proofreadStore.needsProofreading
      expect(entries.map((e) => `${e.type}:${e.id}`)).toEqual([
        'rule:r1',
        'game_datum:gd1',
        'index_entry:e1',
      ])
    })

    it('excludes hidden ASL tables while keeping other tables', () => {
      seedSystem()
      featureState.aslTables = false
      const proofreadStore = useProofreadStore()
      const contentStore = useContentStore()

      proofreadStore.threshold = 3
      contentStore.gameDataByModule['mod1'] = [
        makeGameDatum('ift1', { kind: 'ift' }),
        makeGameDatum('matrix1', { kind: 'matrix' }),
      ]

      expect(proofreadStore.needsProofreading.map((e) => `${e.type}:${e.id}`)).toEqual([
        'game_datum:matrix1',
      ])
    })

    it('returns an empty list when everything is done', () => {
      seedSystem()
      const proofreadStore = useProofreadStore()
      const contentStore = useContentStore()

      proofreadStore.threshold = 3
      proofreadStore.statusMap = { r1: { count: 3, me: true } }
      contentStore.rulesByModule['mod1'] = [makeRule('r1')]

      expect(proofreadStore.needsProofreading).toEqual([])
    })
  })

  describe('record', () => {
    it('POSTs the entity and applies the returned status', async () => {
      seedSystem()
      const proofreadStore = useProofreadStore()
      mockPost.mockResolvedValue({
        ok: true,
        data: {
          data: {
            threshold: 3,
            proofreads: { r1: { count: 1, me: true } },
          },
        },
      })

      await proofreadStore.record('rule', 'r1')

      expect(mockPost).toHaveBeenCalledWith('/systems/sys1/proofreads', {
        entity_type: 'rule',
        entity_id: 'r1',
      })
      expect(proofreadStore.statusMap['r1']).toEqual({ count: 1, me: true })
    })
  })

  describe('remove', () => {
    it('DELETEs the row and re-fetches the authoritative status', async () => {
      seedSystem()
      const proofreadStore = useProofreadStore()
      proofreadStore.statusMap = { r1: { count: 2, me: true } }
      mockDel.mockResolvedValue({ ok: true, data: undefined })
      mockGet.mockResolvedValue({
        ok: true,
        data: {
          data: {
            threshold: 3,
            proofreads: { r1: { count: 1, me: false } },
          },
        },
      })

      await proofreadStore.remove('rule', 'r1')

      expect(mockDel).toHaveBeenCalledWith('/systems/sys1/proofreads/rule/r1')
      expect(mockGet).toHaveBeenCalledWith('/systems/sys1/proofreads')
      expect(proofreadStore.statusMap['r1']).toEqual({ count: 1, me: false })
    })

    it('applies the server status that drops the entry once it reaches zero', async () => {
      seedSystem()
      const proofreadStore = useProofreadStore()
      proofreadStore.statusMap = { r1: { count: 1, me: true } }
      mockDel.mockResolvedValue({ ok: true, data: undefined })
      mockGet.mockResolvedValue({
        ok: true,
        data: {
          data: {
            threshold: 3,
            proofreads: {},
          },
        },
      })

      await proofreadStore.remove('rule', 'r1')

      expect(proofreadStore.statusMap['r1']).toBeUndefined()
    })
  })

  describe('canProofread', () => {
    it('is true when any module grants content.proofread', () => {
      seedSystem(true)
      expect(useProofreadStore().canProofread).toBe(true)
    })

    it('is false for a plain player', () => {
      seedSystem(false)
      expect(useProofreadStore().canProofread).toBe(false)
    })

    it('is false when a module omits its permissions map', () => {
      const systemStore = useSystemStore()
      systemStore.currentSystem = makeSystem('sys1')
      const module = makeModule('mod1', true)
      module.permissions = undefined as unknown as Module['permissions']
      systemStore.modulesBySystem['sys1'] = [module]

      expect(useProofreadStore().canProofread).toBe(false)
    })
  })
})

// ─── Component gating tests ───────────────────────────────────────────────────

describe('RuleDetailChildren proofread gating', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPost.mockReset()
    mockDel.mockReset()
  })

  function mountChildren(rule: Rule) {
    const contentStore = useContentStore()
    contentStore.rulesByModule['mod1'] = [rule]

    const wrapper = shallowMount(RuleDetailChildren, {
      props: {
        rule,
        childrenMap: new Map<string | null, Rule[]>(),
        depth: 0,
        tocDepth: 0,
        canEdit: false,
      },
    })
    return wrapper
  }

  it('shows the proofread toggle when the module grants content.proofread', () => {
    seedSystem(true)
    const wrapper = mountChildren(makeRule('r1'))

    expect(wrapper.findComponent(ProofreadToggle).exists()).toBe(true)
  })

  it('hides the proofread toggle for a plain player', () => {
    seedSystem(false)
    const wrapper = mountChildren(makeRule('r1'))

    expect(wrapper.findComponent(ProofreadToggle).exists()).toBe(false)
  })

  it('shows the bookmark button while the module serves live content', () => {
    seedSystem(false)
    const wrapper = mountChildren(makeRule('r1'))

    expect(wrapper.find('button[title="Bookmark rule"]').exists()).toBe(true)
  })

  it('shows the bookmark button for released content', () => {
    const systemStore = useSystemStore()
    systemStore.currentSystem = makeSystem('sys1')
    const module = makeModule('mod1', false)
    module.permissions['content.view_live'] = false
    module.permissions['content.view_released'] = true
    systemStore.modulesBySystem['sys1'] = [module]

    const wrapper = mountChildren(makeRule('r1'))

    expect(wrapper.find('button[title="Bookmark rule"]').exists()).toBe(true)
  })
})
