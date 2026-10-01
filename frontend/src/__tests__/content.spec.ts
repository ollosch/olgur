import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

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

import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import type { Rule, IndexEntry, Module, System, Membership } from '@/types/domain'

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

function makeModule(id: string, isCore = true): Module {
  return {
    id,
    system_id: 'sys1',
    slug: id,
    name: `Module ${id}`,
    description: null,
    config: null,
    is_core: isCore,
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

function makeIndexEntry(
  overrides: Partial<IndexEntry> & { id: string; module_id: string },
): IndexEntry {
  return {
    term: 'Term',
    definition: '',
    notes: null,
    relations: null,
    parent_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeMembership(systemId: string, config?: Membership['config']): Membership {
  return {
    id: 'mem1',
    system_id: systemId,
    user_id: 'user1',
    admin: false,
    config: config ?? null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

// ─── Setup helper: seed a core module into systemStore ────────────────────────
function seedCoreModule(systemStore: ReturnType<typeof useSystemStore>, moduleId = 'mod1'): void {
  systemStore.currentSystem = makeSystem('sys1')
  systemStore.modulesBySystem['sys1'] = [makeModule(moduleId, true)]
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useContentStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPost.mockReset()
    mockPut.mockReset()
    mockDel.mockReset()
    mockPatch.mockReset()
  })

  // ── childrenMap ─────────────────────────────────────────────────────────────

  describe('childrenMap', () => {
    it('groups rules by parent_id correctly', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      contentStore.rulesByModule['mod1'] = [
        makeRule({ id: 'r1', module_id: 'mod1', parent_id: null }),
        makeRule({ id: 'r2', module_id: 'mod1', parent_id: 'r1' }),
        makeRule({ id: 'r3', module_id: 'mod1', parent_id: 'r1' }),
      ]

      const map = contentStore.childrenMap
      expect(map.get(null)).toHaveLength(1)
      expect(map.get(null)?.[0]?.id).toBe('r1')
      expect(map.get('r1')).toHaveLength(2)
    })

    it('sorts children by sort_order within each parent bucket', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      contentStore.rulesByModule['mod1'] = [
        // Deliberately reversed so we can confirm sorting
        makeRule({ id: 'r2', module_id: 'mod1', parent_id: null, sort_order: 2 }),
        makeRule({ id: 'r1', module_id: 'mod1', parent_id: null, sort_order: 1 }),
      ]

      const children = contentStore.childrenMap.get(null)
      expect(children?.[0]?.id).toBe('r1')
      expect(children?.[1]?.id).toBe('r2')
    })

    it('returns an empty map when there are no rules', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      contentStore.rulesByModule['mod1'] = []

      expect(contentStore.childrenMap.size).toBe(0)
    })
  })

  // ── flattenedRulesByModule ──────────────────────────────────────────────────

  describe('flattenedRulesByModule', () => {
    it('returns rules in depth-first traversal order', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      contentStore.rulesByModule['mod1'] = [
        makeRule({ id: 'r1', module_id: 'mod1', parent_id: null, sort_order: 1 }),
        makeRule({ id: 'r1a', module_id: 'mod1', parent_id: 'r1', sort_order: 1 }),
        makeRule({ id: 'r2', module_id: 'mod1', parent_id: null, sort_order: 2 }),
      ]

      const flattened = contentStore.flattenedRulesByModule.get('mod1')
      expect(flattened?.map((r) => r.id)).toEqual(['r1', 'r1a', 'r2'])
    })

    it('places deeper nested rules immediately after their parent', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      contentStore.rulesByModule['mod1'] = [
        makeRule({ id: 'r1', module_id: 'mod1', parent_id: null, sort_order: 1 }),
        makeRule({ id: 'r1a', module_id: 'mod1', parent_id: 'r1', sort_order: 1 }),
        makeRule({ id: 'r1a1', module_id: 'mod1', parent_id: 'r1a', sort_order: 1 }),
        makeRule({ id: 'r2', module_id: 'mod1', parent_id: null, sort_order: 2 }),
      ]

      const flattened = contentStore.flattenedRulesByModule.get('mod1')
      expect(flattened?.map((r) => r.id)).toEqual(['r1', 'r1a', 'r1a1', 'r2'])
    })
  })

  // ── visibleIndexEntryIds ────────────────────────────────────────────────────

  describe('visibleIndexEntryIds', () => {
    it('hides an entry that has no definition, notes, rule_refs, or see_also', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = [
        makeIndexEntry({ id: 'e1', module_id: 'mod1' }), // all fields empty / null
      ]

      expect(contentStore.visibleIndexEntryIds.has('e1')).toBe(false)
    })

    it('shows an entry that has a non-empty definition', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = [
        makeIndexEntry({ id: 'e1', module_id: 'mod1', definition: 'A term that means something.' }),
      ]

      expect(contentStore.visibleIndexEntryIds.has('e1')).toBe(true)
    })

    it('shows an entry that has notes', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = [
        makeIndexEntry({ id: 'e1', module_id: 'mod1', notes: 'See also the errata.' }),
      ]

      expect(contentStore.visibleIndexEntryIds.has('e1')).toBe(true)
    })

    it('shows an entry whose rule_refs include an active rule number', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      // Seed a rule so rulesByNumber has '1.2'
      contentStore.rulesByModule['mod1'] = [
        makeRule({ id: 'r1', module_id: 'mod1', number: '1.2' }),
      ]
      contentStore.indexEntriesByModule['mod1'] = [
        makeIndexEntry({ id: 'e1', module_id: 'mod1', relations: { rule_refs: ['1.2'] } }),
      ]

      expect(contentStore.visibleIndexEntryIds.has('e1')).toBe(true)
    })

    it('hides an entry whose only rule_refs all point to inactive (unknown) rule numbers', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      // No rules loaded → rulesByNumber is empty
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = [
        makeIndexEntry({ id: 'e1', module_id: 'mod1', relations: { rule_refs: ['9.9'] } }),
      ]

      expect(contentStore.visibleIndexEntryIds.has('e1')).toBe(false)
    })

    it('keeps a parent entry visible when at least one of its children is visible', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = [
        makeIndexEntry({ id: 'parent', module_id: 'mod1' }), // empty — would normally be hidden
        makeIndexEntry({
          id: 'child',
          module_id: 'mod1',
          parent_id: 'parent',
          definition: 'Child has content.',
        }),
      ]

      expect(contentStore.visibleIndexEntryIds.has('parent')).toBe(true)
      expect(contentStore.visibleIndexEntryIds.has('child')).toBe(true)
    })

    it('hides a parent entry when all its descendants are also empty', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedCoreModule(systemStore)
      contentStore.rulesByModule['mod1'] = []
      contentStore.indexEntriesByModule['mod1'] = [
        makeIndexEntry({ id: 'parent', module_id: 'mod1' }),
        makeIndexEntry({ id: 'child', module_id: 'mod1', parent_id: 'parent' }), // also empty
      ]

      expect(contentStore.visibleIndexEntryIds.has('parent')).toBe(false)
      expect(contentStore.visibleIndexEntryIds.has('child')).toBe(false)
    })
  })

  // ── resolveRuleReference ─────────────────────────────────────────────────────

  describe('resolveRuleReference', () => {
    function seedModules(
      systemStore: ReturnType<typeof useSystemStore>,
      globalRuleNumbers: boolean,
      modules: Module[],
    ): void {
      const system = makeSystem('sys1')
      system.config!.global_rule_numbers = globalRuleNumbers
      systemStore.currentSystem = system
      systemStore.modulesBySystem['sys1'] = modules
    }

    it('resolves bare numbers system-wide when global rule numbers are enabled', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedModules(systemStore, true, [makeModule('core', true), makeModule('exp', true)])
      contentStore.rulesByModule['core'] = [
        makeRule({ id: 'r1', module_id: 'core', number: '1.2' }),
      ]
      contentStore.rulesByModule['exp'] = [makeRule({ id: 'r2', module_id: 'exp', number: '2.1' })]

      expect(contentStore.resolveRuleReference('1.2')?.id).toBe('r1')
      expect(contentStore.resolveRuleReference('2.1')?.id).toBe('r2')
      expect(contentStore.resolveRuleReference('1.2', { moduleSlug: 'core' })?.id).toBe('r1')
      expect(contentStore.resolveRuleReference('1.2', { moduleSlug: 'exp' })).toBeNull()
    })

    it('resolves bare numbers in the owning module when global rule numbers are disabled', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedModules(systemStore, false, [makeModule('a', true), makeModule('b', true)])
      contentStore.rulesByModule['a'] = [makeRule({ id: 'rA', module_id: 'a', number: '1.2' })]
      contentStore.rulesByModule['b'] = [makeRule({ id: 'rB', module_id: 'b', number: '1.2' })]

      expect(contentStore.resolveRuleReference('1.2', { moduleId: 'a' })?.id).toBe('rA')
      expect(contentStore.resolveRuleReference('1.2', { moduleId: 'b' })?.id).toBe('rB')
      expect(contentStore.resolveRuleReference('1.2', { moduleSlug: 'b' })?.id).toBe('rB')
      expect(contentStore.resolveRuleReference('1.2')).toBeNull()
    })

    it('returns null for an unknown module slug', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedModules(systemStore, true, [makeModule('core', true)])
      contentStore.rulesByModule['core'] = [
        makeRule({ id: 'r1', module_id: 'core', number: '1.2' }),
      ]

      expect(contentStore.resolveRuleReference('1.2', { moduleSlug: 'missing' })).toBeNull()
    })
  })

  // ── activeModules / singularModule / allIndexEntries (composition) ──────────

  function seedModules(
    systemStore: ReturnType<typeof useSystemStore>,
    modules: Module[],
  ): void {
    systemStore.currentSystem = makeSystem('sys1')
    systemStore.modulesBySystem['sys1'] = modules
  }

  function select(
    membershipStore: ReturnType<typeof useMembershipStore>,
    moduleId: string | null,
  ): void {
    membershipStore.membershipsBySystem['sys1'] = makeMembership('sys1', {
      selected_module_id: moduleId,
    })
  }

  describe('activeModules', () => {
    it('with no selection includes core first, then all viewable non-core by sort_order', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedModules(systemStore, [
        { ...makeModule('core', true), sort_order: 0 },
        { ...makeModule('m2', false), sort_order: 5 },
        { ...makeModule('m1', false), sort_order: 1 },
      ])

      expect(contentStore.activeModules.map((m) => m.id)).toEqual(['core', 'm1', 'm2'])
    })

    it('with a selection includes core and the selected module only', () => {
      const systemStore = useSystemStore()
      const membershipStore = useMembershipStore()
      const contentStore = useContentStore()

      seedModules(systemStore, [
        { ...makeModule('core', true), sort_order: 0 },
        { ...makeModule('m1', false), sort_order: 1 },
        { ...makeModule('m2', false), sort_order: 2 },
      ])
      select(membershipStore, 'm2')

      expect(contentStore.activeModules.map((m) => m.id)).toEqual(['core', 'm2'])
    })

    it('yields only core when the selection points at core', () => {
      const systemStore = useSystemStore()
      const membershipStore = useMembershipStore()
      const contentStore = useContentStore()

      seedModules(systemStore, [
        { ...makeModule('core', true), sort_order: 0 },
        { ...makeModule('m1', false), sort_order: 1 },
      ])
      select(membershipStore, 'core')

      expect(contentStore.activeModules.map((m) => m.id)).toEqual(['core'])
    })
  })

  describe('singularModule', () => {
    it('defaults to the core module when nothing is selected', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedModules(systemStore, [
        { ...makeModule('core', true), sort_order: 0 },
        { ...makeModule('m1', false), sort_order: 1 },
      ])

      expect(contentStore.singularModule?.id).toBe('core')
    })

    it('returns the selected module when set', () => {
      const systemStore = useSystemStore()
      const membershipStore = useMembershipStore()
      const contentStore = useContentStore()

      seedModules(systemStore, [
        { ...makeModule('core', true), sort_order: 0 },
        { ...makeModule('m1', false), sort_order: 1 },
      ])
      select(membershipStore, 'm1')

      expect(contentStore.singularModule?.id).toBe('m1')
    })
  })

  describe('flatRootRules', () => {
    it('merges roots across modules in module order, then rule sort_order', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedModules(systemStore, [
        { ...makeModule('core', true), sort_order: 0 },
        { ...makeModule('m2', false), sort_order: 5 },
        { ...makeModule('m1', false), sort_order: 1 },
      ])

      contentStore.rulesByModule['core'] = [
        makeRule({ id: 'c2', module_id: 'core', sort_order: 2 }),
        makeRule({ id: 'c1', module_id: 'core', sort_order: 1 }),
        makeRule({ id: 'c1-child', module_id: 'core', parent_id: 'c1' }),
      ]
      contentStore.rulesByModule['m1'] = [makeRule({ id: 'm1a', module_id: 'm1' })]
      contentStore.rulesByModule['m2'] = [makeRule({ id: 'm2a', module_id: 'm2' })]

      expect(contentStore.flatRootRules.map((r) => r.id)).toEqual(['c1', 'c2', 'm1a', 'm2a'])
    })
  })

  describe('globalRuleNumbers', () => {
    it('reflects the system config', () => {
      const systemStore = useSystemStore()
      const contentStore = useContentStore()

      seedModules(systemStore, [makeModule('core', true)])
      expect(contentStore.globalRuleNumbers).toBe(true)

      systemStore.currentSystem!.config!.global_rule_numbers = false
      expect(contentStore.globalRuleNumbers).toBe(false)
    })
  })

  describe('allIndexEntries (singular)', () => {
    it('sources entries from the singular module only, never a union', () => {
      const systemStore = useSystemStore()
      const membershipStore = useMembershipStore()
      const contentStore = useContentStore()

      seedModules(systemStore, [
        { ...makeModule('core', true), sort_order: 0 },
        { ...makeModule('m1', false), sort_order: 1 },
      ])
      contentStore.indexEntriesByModule['core'] = [
        makeIndexEntry({ id: 'e-core', module_id: 'core' }),
      ]
      contentStore.indexEntriesByModule['m1'] = [
        makeIndexEntry({ id: 'e-m1', module_id: 'm1' }),
      ]

      expect(contentStore.allIndexEntries.map((e) => e.id)).toEqual(['e-core'])

      select(membershipStore, 'm1')
      expect(contentStore.allIndexEntries.map((e) => e.id)).toEqual(['e-m1'])
    })
  })
})
