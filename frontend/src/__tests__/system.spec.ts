import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mock useApi for the system store ─────────────────────────────────────────
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPut = vi.fn()
const mockDel = vi.fn()
const mockLoading = ref(false)

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    post: mockPost,
    put: mockPut,
    del: mockDel,
    loading: mockLoading,
  })),
}))

// ─── Mock the content store (imported dynamically inside createVersion) ───────
const { mockFetchManifest } = vi.hoisted(() => ({ mockFetchManifest: vi.fn() }))

vi.mock('@/stores/content', () => ({
  useContentStore: vi.fn(() => ({ fetchManifest: mockFetchManifest })),
}))

import { useSystemStore } from '@/stores/system'

// ─────────────────────────────────────────────────────────────────────────────

describe('useSystemStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPost.mockReset()
    mockFetchManifest.mockReset()
    mockFetchManifest.mockResolvedValue(undefined)
  })

  describe('createVersion', () => {
    it('re-fetches the manifest after a successful release', async () => {
      mockPost.mockResolvedValue({ ok: true, data: {} })

      await useSystemStore().createVersion('sys1', 'mod1', '1.0.0')

      expect(mockPost).toHaveBeenCalledWith('/systems/sys1/modules/mod1/versions', {
        version_string: '1.0.0',
        notes: '',
        expected_draft_revision: 0,
        release_notes: [],
      })
      expect(mockFetchManifest).toHaveBeenCalledWith('sys1')
    })

    it('does not re-fetch the manifest when the release fails', async () => {
      mockPost.mockResolvedValue({ ok: false, errors: {} })

      await useSystemStore().createVersion('sys1', 'mod1', '1.0.0')

      expect(mockFetchManifest).not.toHaveBeenCalled()
    })
  })
})
