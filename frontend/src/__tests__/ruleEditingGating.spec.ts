import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    patch: vi.fn(),
    loading: ref(false),
  })),
}))

import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { useOnline } from '@/composables/useOnline'
import RuleDetailChildren from '@/components/systems/RuleDetailChildren.vue'
import IndexEntryResult from '@/components/systems/IndexEntryResult.vue'
import type { IndexEntry, ManifestEntry, Module, Rule } from '@/types/domain'

function makeModule(overrides: Partial<Module> = {}): Module {
  return {
    id: 'mod1',
    system_id: 'sys1',
    slug: 'mod1',
    name: 'Module 1',
    description: null,
    config: null,
    is_core: true,
    sort_order: 0,
    draft_revision: 0,
    permissions: {
      'module.update': false,
      'module.delete': false,
      'content.view_live': true,
      'content.view_released': true,
      'content.edit': true,
      'content.proofread': false,
      'version.publish': false,
      'version.amend_latest': true,
      'subscription.manage': false,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeRule(): Rule {
  return {
    id: 'rule1',
    module_id: 'mod1',
    parent_id: null,
    number: '1.1',
    title: 'Rule 1.1',
    content: 'Content',
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeIndexEntry(): IndexEntry {
  return {
    id: 'idx1',
    module_id: 'mod1',
    parent_id: null,
    term: 'Term',
    definition: 'Definition',
    notes: null,
    relations: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeManifest(): ManifestEntry {
  return {
    module_id: 'mod1',
    version_id: 'v1',
    version_string: '1.0',
    released_at: '2024-01-01T00:00:00Z',
    revision: 0,
    content: {
      rules: 'https://cdn.example.com/rules.json',
      index: 'https://cdn.example.com/index.json',
      'game-data': 'https://cdn.example.com/game-data.json',
    },
  }
}

function mountRule(canEdit: boolean) {
  return shallowMount(RuleDetailChildren, {
    props: {
      rule: makeRule(),
      childrenMap: new Map<string | null, Rule[]>(),
      depth: 0,
      tocDepth: 0,
      canEdit,
    },
  })
}

describe('release-mode editing gates', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const systemStore = useSystemStore()
    systemStore.currentSystem = {
      id: 'sys1',
      slug: 'sys1',
      name: 'System',
      description: null,
      config: null,
      permissions: {
        'system.manage': false,
        'membership.manage': false,
        'module.create': false,
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }
    systemStore.modulesBySystem = { sys1: [makeModule()] }
    const contentStore = useContentStore()
    contentStore.manifestByModule = { mod1: makeManifest() }
    contentStore.viewMode = 'draft'
    useOnline().online.value = true
  })

  describe('RuleDetailChildren', () => {
    it('shows edit and delete in Draft mode for an editor', () => {
      const wrapper = mountRule(true)

      expect(wrapper.find('button[title="Edit rule"]').exists()).toBe(true)
      expect(wrapper.find('button[title="Delete rule"]').exists()).toBe(true)
    })

    it('hides edit and delete in Release mode', () => {
      useContentStore().viewMode = 'release'
      const wrapper = mountRule(true)

      expect(wrapper.find('button[title="Edit rule"]').exists()).toBe(false)
      expect(wrapper.find('button[title="Delete rule"]').exists()).toBe(false)
    })

    it('shows the back-edit wrench in Draft mode', () => {
      const wrapper = mountRule(true)

      expect(wrapper.find('button[title="Back-edit released version"]').exists()).toBe(true)
    })

    it('shows the back-edit wrench in Release mode', () => {
      useContentStore().viewMode = 'release'
      const wrapper = mountRule(false)

      expect(wrapper.find('button[title="Back-edit released version"]').exists()).toBe(true)
    })

    it('hides the wrench when offline or the module lacks amend permission', () => {
      useOnline().online.value = false
      const offlineWrapper = mountRule(false)
      expect(offlineWrapper.find('button[title="Back-edit released version"]').exists()).toBe(
        false,
      )

      useOnline().online.value = true
      const systemStore = useSystemStore()
      systemStore.modulesBySystem = {
        sys1: [
          makeModule({
            permissions: { ...makeModule().permissions, 'version.amend_latest': false },
          }),
        ],
      }
      const noPermissionWrapper = mountRule(false)
      expect(
        noPermissionWrapper.find('button[title="Back-edit released version"]').exists(),
      ).toBe(false)
    })
  })

  describe('IndexEntryResult', () => {
    function mountIndex() {
      return shallowMount(IndexEntryResult, { props: { entry: makeIndexEntry() } })
    }

    it('shows the edit pencil in Draft mode for an editor', () => {
      expect(mountIndex().find('button[title="Edit entry"]').exists()).toBe(true)
    })

    it('hides the edit pencil in Release mode', () => {
      useContentStore().viewMode = 'release'

      expect(mountIndex().find('button[title="Edit entry"]').exists()).toBe(false)
    })
  })
})
