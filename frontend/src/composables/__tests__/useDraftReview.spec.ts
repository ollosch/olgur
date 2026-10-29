import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const mockGet = vi.fn()
const mockPatch = vi.fn()

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    patch: mockPatch,
    loading: ref(false),
  })),
}))

import { useDraftReview } from '@/composables/useDraftReview'
import type { ModuleDraftChange } from '@/types/domain'

function makeChange(overrides: Partial<ModuleDraftChange> = {}): ModuleDraftChange {
  return {
    id: 'change1',
    module_id: 'mod1',
    module_version_id: null,
    entity_type: 'rule',
    entity_id: 'rule1',
    change_type: 'update',
    classification: 'semantic',
    content_before: { title: 'Old title', content: 'Old content' },
    content_after: { title: 'New title', content: 'New content' },
    changed_by: 'user1',
    changed_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('useDraftReview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPatch.mockReset()
  })

  describe('load', () => {
    it('loads pending changes and the draft revision', async () => {
      mockGet.mockResolvedValue({
        ok: true,
        data: { data: [makeChange()], draft_revision: 7 },
      })

      const review = useDraftReview('sys1', 'mod1')
      await review.load()

      expect(mockGet).toHaveBeenCalledWith(
        '/systems/sys1/modules/mod1/draft-changes?pending=1',
      )
      expect(review.changes.value).toHaveLength(1)
      expect(review.draftRevision.value).toBe(7)
      expect(review.error.value).toBeNull()
    })

    it('sets an error when loading throws', async () => {
      mockGet.mockRejectedValue({ type: 'network', message: 'Offline' })

      const review = useDraftReview('sys1', 'mod1')
      await review.load()

      expect(review.error.value).toBe('Offline')
      expect(review.loading.value).toBe(false)
    })
  })

  describe('groups', () => {
    it('groups changes by entity type and id', async () => {
      mockGet.mockResolvedValue({
        ok: true,
        data: {
          data: [
            makeChange({ id: 'c1', change_type: 'update' }),
            makeChange({ id: 'c2', change_type: 'delete' }),
            makeChange({
              id: 'c3',
              entity_type: 'index_entry',
              entity_id: 'idx1',
              content_before: { term: 'Old term' },
              content_after: { term: 'New term' },
            }),
          ],
          draft_revision: 2,
        },
      })

      const review = useDraftReview('sys1', 'mod1')
      await review.load()

      expect(review.groups.value).toHaveLength(2)
      expect(review.groups.value[0]!.key).toBe('rule:rule1')
      expect(review.groups.value[0]!.changes).toHaveLength(2)
      expect(review.groups.value[1]!.key).toBe('index_entry:idx1')
    })

    it('is semantic when any change in the group is semantic', async () => {
      mockGet.mockResolvedValue({
        ok: true,
        data: {
          data: [
            makeChange({ id: 'c1', classification: 'typo' }),
            makeChange({ id: 'c2', classification: 'semantic' }),
          ],
          draft_revision: 1,
        },
      })

      const review = useDraftReview('sys1', 'mod1')
      await review.load()

      expect(review.groups.value[0]!.classification).toBe('semantic')
    })

    it('is typo when every change in the group is a typo', async () => {
      mockGet.mockResolvedValue({
        ok: true,
        data: {
          data: [makeChange({ classification: 'typo' })],
          draft_revision: 1,
        },
      })

      const review = useDraftReview('sys1', 'mod1')
      await review.load()

      expect(review.groups.value[0]!.classification).toBe('typo')
    })

    it('uses the entity title/term/name as the label and falls back to the id', async () => {
      mockGet.mockResolvedValue({
        ok: true,
        data: {
          data: [
            makeChange({ id: 'rule-change' }),
            makeChange({
              id: 'index-change',
              entity_type: 'index_entry',
              entity_id: 'idx1',
              content_before: null,
              content_after: { term: 'Index term' },
            }),
            makeChange({
              id: 'game-change',
              entity_type: 'game_datum',
              entity_id: 'gd1',
              content_before: { name: 'Old name' },
              content_after: {},
            }),
            makeChange({
              id: 'missing-label',
              entity_type: 'game_datum',
              entity_id: 'gd2',
              content_before: null,
              content_after: null,
            }),
          ],
          draft_revision: 1,
        },
      })

      const review = useDraftReview('sys1', 'mod1')
      await review.load()

      const labels = review.groups.value.map((group) => group.label)
      expect(labels).toContain('New title')
      expect(labels).toContain('Index term')
      expect(labels).toContain('Old name')
      expect(labels).toContain('gd2')
    })
  })

  describe('setGroupClassification', () => {
    it('PATCHes every change in the group and updates local state', async () => {
      mockGet.mockResolvedValue({
        ok: true,
        data: {
          data: [
            makeChange({ id: 'c1', classification: 'semantic' }),
            makeChange({ id: 'c2', classification: 'semantic' }),
          ],
          draft_revision: 1,
        },
      })
      mockPatch.mockResolvedValue({ ok: true, data: {} })

      const review = useDraftReview('sys1', 'mod1')
      await review.load()

      await review.setGroupClassification(review.groups.value[0]!, 'typo')

      expect(mockPatch).toHaveBeenCalledTimes(2)
      expect(mockPatch).toHaveBeenCalledWith(
        '/systems/sys1/modules/mod1/draft-changes/c1',
        { classification: 'typo' },
      )
      expect(mockPatch).toHaveBeenCalledWith(
        '/systems/sys1/modules/mod1/draft-changes/c2',
        { classification: 'typo' },
      )
      expect(review.groups.value[0]!.classification).toBe('typo')
    })

    it('sets an error and leaves state unchanged when a PATCH fails', async () => {
      mockGet.mockResolvedValue({
        ok: true,
        data: { data: [makeChange()], draft_revision: 1 },
      })
      mockPatch.mockResolvedValue({
        ok: false,
        errors: { classification: 'Invalid classification.' },
      })

      const review = useDraftReview('sys1', 'mod1')
      await review.load()

      await review.setGroupClassification(review.groups.value[0]!, 'typo')

      expect(review.error.value).toBe('Invalid classification.')
      expect(review.groups.value[0]!.classification).toBe('semantic')
    })
  })
})
