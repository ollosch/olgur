import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ── Mock request() from @/lib/http ────────────────────────────────────────────
const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }))

vi.mock('@/lib/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/http')>()
  return { ...actual, request: mockRequest }
})

// ── Mock useApi (used by useRetrofix and contentStore) ────────────────────────
const mockPost = vi.fn()
const mockPut = vi.fn()

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: vi.fn(),
    post: mockPost,
    put: mockPut,
    del: vi.fn(),
    patch: vi.fn(),
    loading: ref(false),
  })),
}))

import { useContentStore } from '@/stores/content'
import { useRetrofix } from '@/composables/useRetrofix'
import type { Rule } from '@/types/domain'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: 'rule1',
    module_id: 'mod1',
    parent_id: null,
    number: '1.1',
    title: 'Test Rule',
    content: 'Draft content',
    markdown: null,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('useRetrofix', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPost.mockReset()
    mockPut.mockReset()
    mockRequest.mockReset()
  })

  // ── isDiverged ───────────────────────────────────────────────────────────────

  describe('isDiverged', () => {
    it('is false when both refs are empty (initial state)', () => {
      const { isDiverged } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      expect(isDiverged.value).toBe(false)
    })

    it('is false when released content equals draft content', () => {
      const { releasedContent, draftContent, isDiverged } = useRetrofix(
        'sys1',
        'mod1',
        'v1',
        'rule1',
      )
      releasedContent.value = 'same text'
      draftContent.value = 'same text'
      expect(isDiverged.value).toBe(false)
    })

    it('is false when contents are equal after trimming whitespace', () => {
      const { releasedContent, draftContent, isDiverged } = useRetrofix(
        'sys1',
        'mod1',
        'v1',
        'rule1',
      )
      releasedContent.value = '  text  '
      draftContent.value = 'text'
      expect(isDiverged.value).toBe(false)
    })

    it('is true when released content differs from draft content', () => {
      const { releasedContent, draftContent, isDiverged } = useRetrofix(
        'sys1',
        'mod1',
        'v1',
        'rule1',
      )
      releasedContent.value = 'released text'
      draftContent.value = 'draft text'
      expect(isDiverged.value).toBe(true)
    })

    it('becomes false reactively when content is edited to match', () => {
      const { releasedContent, draftContent, isDiverged } = useRetrofix(
        'sys1',
        'mod1',
        'v1',
        'rule1',
      )
      releasedContent.value = 'A'
      draftContent.value = 'B'
      expect(isDiverged.value).toBe(true)

      draftContent.value = 'A'
      expect(isDiverged.value).toBe(false)
    })
  })

  // ── loadReleasedContent ──────────────────────────────────────────────────────

  describe('loadReleasedContent', () => {
    it('fetches the manifest URL and sets releasedContent', async () => {
      const contentStore = useContentStore()
      contentStore.rulesByModule['mod1'] = [makeRule()]

      const releasedRule = makeRule({ content: 'Released content' })
      mockRequest.mockResolvedValue({ data: [releasedRule] })

      const { releasedContent, loadReleasedContent } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      await loadReleasedContent('https://cdn.example.com/mod1/rules.json')

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: 'https://cdn.example.com/mod1/rules.json',
      })
      expect(releasedContent.value).toBe('Released content')
    })

    it('normalises <br> to newlines in released content', async () => {
      const contentStore = useContentStore()
      contentStore.rulesByModule['mod1'] = [makeRule()]

      mockRequest.mockResolvedValue({ data: [makeRule({ content: 'line1<br>line2' })] })

      const { releasedContent, loadReleasedContent } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      await loadReleasedContent('https://cdn.example.com/mod1/rules.json')

      expect(releasedContent.value).toBe('line1\nline2')
    })

    it('initialises draftContent from the content store', async () => {
      const contentStore = useContentStore()
      contentStore.rulesByModule['mod1'] = [makeRule({ content: 'Store draft content' })]

      mockRequest.mockResolvedValue({ data: [makeRule({ content: 'Released content' })] })

      const { draftContent, loadReleasedContent } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      await loadReleasedContent('https://cdn.example.com/mod1/rules.json')

      expect(draftContent.value).toBe('Store draft content')
    })

    it('sets isLoading to false after completion', async () => {
      const contentStore = useContentStore()
      contentStore.rulesByModule['mod1'] = [makeRule()]
      mockRequest.mockResolvedValue({ data: [makeRule()] })

      const { isLoading, loadReleasedContent } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      await loadReleasedContent('https://cdn.example.com/mod1/rules.json')

      expect(isLoading.value).toBe(false)
    })

    it('sets errors.load when the fetch throws', async () => {
      mockRequest.mockRejectedValue(new Error('Network error'))

      const { errors, loadReleasedContent } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      await loadReleasedContent('https://cdn.example.com/mod1/rules.json')

      expect(errors.value).toEqual({ load: 'Failed to load released version.' })
    })
  })

  // ── applyAmendment ───────────────────────────────────────────────────────────

  describe('applyAmendment', () => {
    it('POSTs to the amendments endpoint with the correct payload', async () => {
      mockPost.mockResolvedValue({ ok: true, data: {} })

      const { releasedContent, applyAmendment } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      releasedContent.value = 'Fixed content'

      await applyAmendment('correction', 'Fixed a typo')

      expect(mockPost).toHaveBeenCalledWith(
        '/systems/sys1/modules/mod1/versions/v1/amendments',
        {
          entity_type: 'rule',
          entity_id: 'rule1',
          change_type: 'correction',
          description: 'Fixed a typo',
          content: { content: 'Fixed content' },
        },
      )
    })

    it('converts newlines to <br> in the posted content', async () => {
      mockPost.mockResolvedValue({ ok: true, data: {} })

      const { releasedContent, applyAmendment } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      releasedContent.value = 'line1\nline2'

      await applyAmendment('update', 'desc')

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ content: { content: 'line1<br>line2' } }),
      )
    })

    it('sets errors when the POST returns ok: false', async () => {
      mockPost.mockResolvedValue({ ok: false, errors: { description: 'Required.' } })

      const { errors, applyAmendment } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      await applyAmendment('correction', '')

      expect(errors.value).toEqual({ description: 'Required.' })
    })

    it('clears errors before posting', async () => {
      mockPost.mockResolvedValue({ ok: true, data: {} })

      const { errors, applyAmendment } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      errors.value = { old: 'stale error' }

      await applyAmendment('correction', 'desc')

      expect(errors.value).toBeNull()
    })
  })

  // ── applyDraftFix ────────────────────────────────────────────────────────────

  describe('applyDraftFix', () => {
    it('calls contentStore.updateRule with the updated draft content', async () => {
      const contentStore = useContentStore()
      const rule = makeRule({ content: 'Original content' })
      contentStore.rulesByModule['mod1'] = [rule]

      const spy = vi
        .spyOn(contentStore, 'updateRule')
        .mockResolvedValue({ ok: true, data: makeRule() })

      const { draftContent, applyDraftFix } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      draftContent.value = 'Updated draft content'

      await applyDraftFix()

      expect(spy).toHaveBeenCalledWith(
        'sys1',
        rule,
        expect.objectContaining({ content: 'Updated draft content' }),
      )
    })

    it('does nothing when the rule is not found in the store', async () => {
      const contentStore = useContentStore()
      contentStore.rulesByModule['mod1'] = []

      const spy = vi.spyOn(contentStore, 'updateRule')

      const { applyDraftFix } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      await applyDraftFix()

      expect(spy).not.toHaveBeenCalled()
    })

    it('sets errors when updateRule returns ok: false', async () => {
      const contentStore = useContentStore()
      contentStore.rulesByModule['mod1'] = [makeRule()]

      vi.spyOn(contentStore, 'updateRule').mockResolvedValue({
        ok: false,
        errors: { content: 'Too long.' },
      })

      const { errors, applyDraftFix } = useRetrofix('sys1', 'mod1', 'v1', 'rule1')
      await applyDraftFix()

      expect(errors.value).toEqual({ content: 'Too long.' })
    })
  })
})
