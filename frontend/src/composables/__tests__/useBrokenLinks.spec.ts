import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
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

import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { useBrokenLinks } from '@/composables/useBrokenLinks'
import type { BrokenReference, Module, System } from '@/types/domain'

function makeSystem(permissions: System['permissions']): System {
  return {
    id: 'sys1',
    slug: 'sys1',
    name: 'System',
    description: null,
    config: null,
    permissions,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

function makeModule(permissions: Module['permissions']): Module {
  return {
    id: 'mod1',
    system_id: 'sys1',
    slug: 'core',
    name: 'Core',
    description: null,
    config: null,
    is_core: true,
    sort_order: 0,
    permissions,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }
}

const editorPermissions: Module['permissions'] = {
  'module.update': false,
  'module.delete': false,
  'content.view_live': true,
  'content.view_released': false,
  'content.edit': true,
  'content.proofread': false,
  'version.publish': false,
  'version.amend_latest': false,
  'subscription.manage': false,
}

function makeBrokenReference(): BrokenReference {
  return {
    module: 'core',
    location: '1.1',
    kind: 'rule',
    reference: '{{L:9.9}}',
    reason: 'unknown_number',
  }
}

describe('useBrokenLinks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
  })

  describe('canLint', () => {
    it('is true for a system admin', () => {
      const systemStore = useSystemStore()
      systemStore.currentSystem = makeSystem({
        'system.manage': true,
        'membership.manage': false,
        'module.create': false,
      })
      systemStore.modulesBySystem['sys1'] = []

      expect(useBrokenLinks().canLint.value).toBe(true)
    })

    it('is true when the user edits at least one module', () => {
      const systemStore = useSystemStore()
      systemStore.currentSystem = makeSystem({
        'system.manage': false,
        'membership.manage': false,
        'module.create': false,
      })
      systemStore.modulesBySystem['sys1'] = [makeModule(editorPermissions)]

      expect(useBrokenLinks().canLint.value).toBe(true)
    })

    it('is false for a non-admin, non-editor member', () => {
      const systemStore = useSystemStore()
      systemStore.currentSystem = makeSystem({
        'system.manage': false,
        'membership.manage': false,
        'module.create': false,
      })
      systemStore.modulesBySystem['sys1'] = [
        makeModule({ ...editorPermissions, 'content.edit': false }),
      ]

      expect(useBrokenLinks().canLint.value).toBe(false)
    })
  })

  describe('run', () => {
    it('stores lint results on success', async () => {
      const systemStore = useSystemStore()
      systemStore.currentSystem = makeSystem({
        'system.manage': false,
        'membership.manage': false,
        'module.create': false,
      })
      systemStore.modulesBySystem['sys1'] = []

      const contentStore = useContentStore()
      const broken = makeBrokenReference()
      vi.spyOn(contentStore, 'fetchLint').mockResolvedValue({ ok: true, data: [broken] })

      const { results, run } = useBrokenLinks()
      await run('sys1')

      expect(results.value).toEqual([broken])
    })

    it('clears results when the lint request fails', async () => {
      const systemStore = useSystemStore()
      systemStore.currentSystem = makeSystem({
        'system.manage': false,
        'membership.manage': false,
        'module.create': false,
      })
      systemStore.modulesBySystem['sys1'] = []

      const contentStore = useContentStore()
      vi.spyOn(contentStore, 'fetchLint').mockRejectedValue(new Error('forbidden'))

      const { results, run } = useBrokenLinks()
      await run('sys1')

      expect(results.value).toEqual([])
    })
  })
})
