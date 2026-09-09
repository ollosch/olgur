import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ── Mock useApi to prevent real HTTP calls ────────────────────────────────────
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
import { useVersionStatus } from '@/composables/useVersionStatus'
import type { ManifestEntry, System, Module } from '@/types/domain'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeManifestEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    module_id: 'mod1',
    version_id: 'v1',
    version_string: '1.4',
    released_at: '2024-01-01T00:00:00Z',
    revision: 0,
    content: {
      rules: 'https://cdn.example.com/rules.json',
      index: 'https://cdn.example.com/index.json',
      'game-data': 'https://cdn.example.com/game-data.json',
    },
    ...overrides,
  }
}

function makeSystem(id = 'sys1'): System {
  return {
    id,
    slug: id,
    name: `System ${id}`,
    description: null,
    config: {
      system_structure: 'core_plus_many',
      sort_rules_by: 'number',
      toc_depth: 3,
      cover_image: null,
    },
    permissions: { 'system.manage': false, 'membership.manage': false, 'module.create': false },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeModule(overrides: Partial<Module> & { id: string }): Module {
  return {
    system_id: 'sys1',
    slug: overrides.id,
    name: `Module ${overrides.id}`,
    description: null,
    config: null,
    is_core: true,
    sort_order: 0,
    permissions: {
      'module.update': false,
      'module.delete': false,
      'content.view_live': false,
      'content.view_released': false,
      'content.edit': false,
      'version.publish': false,
      'version.amend_latest': false,
      'subscription.manage': false,
      'module.activate': false,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useVersionStatus', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // ── displayVersion ─────────────────────────────────────────────────────────

  describe('displayVersion', () => {
    it('returns "No released version" when no manifest entry', () => {
      const { displayVersion } = useVersionStatus('mod1')
      expect(displayVersion.value).toBe('No released version')
    })

    it('returns "v1.4" when revision is 0', () => {
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod1'] = makeManifestEntry({
        version_string: '1.4',
        revision: 0,
      })
      const { displayVersion } = useVersionStatus('mod1')
      expect(displayVersion.value).toBe('v1.4')
    })

    it('returns "v1.4 rev3" when revision is 3', () => {
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod1'] = makeManifestEntry({
        version_string: '1.4',
        revision: 3,
      })
      const { displayVersion } = useVersionStatus('mod1')
      expect(displayVersion.value).toBe('v1.4 rev3')
    })
  })

  // ── hasReleasedVersion ─────────────────────────────────────────────────────

  describe('hasReleasedVersion', () => {
    it('is false when no manifest entry', () => {
      const { hasReleasedVersion } = useVersionStatus('mod1')
      expect(hasReleasedVersion.value).toBe(false)
    })

    it('is true when a manifest entry exists', () => {
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod1'] = makeManifestEntry()
      const { hasReleasedVersion } = useVersionStatus('mod1')
      expect(hasReleasedVersion.value).toBe(true)
    })
  })

  // ── isLiveContent ──────────────────────────────────────────────────────────

  describe('isLiveContent', () => {
    it('is false when the module has no permission map', () => {
      const { isLiveContent } = useVersionStatus('mod1')
      expect(isLiveContent.value).toBe(false)
    })

    it('is true when the module grants content.view_live', () => {
      const systemStore = useSystemStore()
      systemStore.currentSystem = makeSystem('sys1')
      const module = makeModule({ id: 'mod1' })
      module.permissions = { ...module.permissions, 'content.view_live': true }
      systemStore.modulesBySystem['sys1'] = [module]

      const { isLiveContent } = useVersionStatus('mod1')
      expect(isLiveContent.value).toBe(true)
    })
  })
})
