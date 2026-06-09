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
import { useVersionStatus } from '@/composables/useVersionStatus'
import type { ManifestEntry } from '@/types/domain'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeManifestEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    module_id: 'mod1',
    version_id: 'v1',
    version_string: '1.4',
    released_at: '2024-01-01T00:00:00Z',
    revision: 0,
    files: {
      rules: 'https://cdn.example.com/rules.json',
      index: 'https://cdn.example.com/index.json',
      'game-data': 'https://cdn.example.com/game-data.json',
    },
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
      contentStore.manifestByModule['mod1'] = makeManifestEntry({ version_string: '1.4', revision: 0 })
      const { displayVersion } = useVersionStatus('mod1')
      expect(displayVersion.value).toBe('v1.4')
    })

    it('returns "v1.4 rev3" when revision is 3', () => {
      const contentStore = useContentStore()
      contentStore.manifestByModule['mod1'] = makeManifestEntry({ version_string: '1.4', revision: 3 })
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

  // ── isDesigner ─────────────────────────────────────────────────────────────

  describe('isDesigner', () => {
    it('delegates correctly to contentStore.isDesigner', () => {
      const contentStore = useContentStore()
      const { isDesigner } = useVersionStatus('mod1')
      // Default state: no authenticated user → isDesigner is false
      expect(isDesigner.value).toBe(false)
      expect(isDesigner.value).toBe(contentStore.isDesigner)
    })
  })
})
