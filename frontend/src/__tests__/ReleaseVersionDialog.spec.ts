import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
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

vi.mock('@/components/ui/input', () => ({
  Input: defineComponent({
    name: 'InputStub',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" v-bind="$attrs" />',
  }),
}))

const { mockToastSuccess } = vi.hoisted(() => ({ mockToastSuccess: vi.fn() }))

vi.mock('vue-sonner', () => ({
  toast: { success: mockToastSuccess, error: vi.fn() },
}))

import ReleaseVersionDialog from '@/components/systems/ReleaseVersionDialog.vue'
import DiscardChangesDialog from '@/components/DiscardChangesDialog.vue'
import { useSystemStore } from '@/stores/system'
import type { ModuleDraftChange } from '@/types/domain'
import { dialogStubs } from './helpers/dialogStubs'

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

function mockReview(changes: ModuleDraftChange[] = [makeChange()], revision = 4): void {
  mockGet.mockResolvedValue({ ok: true, data: { data: changes, draft_revision: revision } })
}

function mountDialog() {
  return mount(ReleaseVersionDialog, {
    props: { systemId: 'sys1', moduleId: 'mod1', moduleName: 'Core', open: true },
    global: { stubs: dialogStubs() },
  })
}

describe('ReleaseVersionDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockGet.mockReset()
    mockPatch.mockReset()
    mockReview()
  })

  it('loads the pending draft review on open', async () => {
    mockReview([makeChange()], 9)
    mountDialog()
    await flushPromises()

    expect(mockGet).toHaveBeenCalledWith(
      '/systems/sys1/modules/mod1/draft-changes?pending=1',
    )
  })

  it('releases a version with release notes covering the semantic groups', async () => {
    const systemStore = useSystemStore()
    const createVersion = vi
      .spyOn(systemStore, 'createVersion')
      .mockResolvedValue({ ok: true, data: undefined })

    const wrapper = mountDialog()
    await flushPromises()

    await wrapper.find('#ver-string').setValue('0.1')
    await wrapper.find('input[data-note-input="rule:rule1"]').setValue('Clarified the rule')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createVersion).toHaveBeenCalledWith('sys1', 'mod1', {
      version_string: '0.1',
      notes: '',
      expected_draft_revision: 4,
      release_notes: [
        { entity_type: 'rule', entity_id: 'rule1', note: 'Clarified the rule' },
      ],
    })
    expect(wrapper.emitted('update:open')).toContainEqual([false])
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('disables release and refuses to submit while a semantic note is missing', async () => {
    const systemStore = useSystemStore()
    const createVersion = vi
      .spyOn(systemStore, 'createVersion')
      .mockResolvedValue({ ok: true, data: undefined })

    const wrapper = mountDialog()
    await flushPromises()

    await wrapper.find('#ver-string').setValue('0.1')

    const release = wrapper.findAll('button').find((b) => b.text().trim() === 'Release')
    expect(release!.attributes('disabled')).toBeDefined()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createVersion).not.toHaveBeenCalled()
  })

  it('allows typo-only drafts to submit without release notes', async () => {
    mockReview([makeChange({ classification: 'typo' })])
    const systemStore = useSystemStore()
    const createVersion = vi
      .spyOn(systemStore, 'createVersion')
      .mockResolvedValue({ ok: true, data: undefined })

    const wrapper = mountDialog()
    await flushPromises()

    await wrapper.find('#ver-string').setValue('0.2')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createVersion).toHaveBeenCalledWith('sys1', 'mod1', {
      version_string: '0.2',
      notes: '',
      expected_draft_revision: 4,
      release_notes: [],
    })
  })

  it('reclassifies a group when the semantic/typo toggle is clicked', async () => {
    mockPatch.mockResolvedValue({ ok: true, data: {} })
    const wrapper = mountDialog()
    await flushPromises()

    const typo = wrapper.findAll('button').find((b) => b.text().trim() === 'Typo')
    await typo!.trigger('click')
    await flushPromises()

    expect(mockPatch).toHaveBeenCalledWith(
      '/systems/sys1/modules/mod1/draft-changes/change1',
      { classification: 'typo' },
    )
  })

  it('shows a conflict message and reloads the review on 409', async () => {
    const systemStore = useSystemStore()
    vi.spyOn(systemStore, 'createVersion').mockRejectedValue({
      type: 'conflict',
      message: 'The draft has changed since it was reviewed. Reload and try again.',
    })

    const wrapper = mountDialog()
    await flushPromises()
    expect(mockGet).toHaveBeenCalledTimes(1)

    await wrapper.find('#ver-string').setValue('0.1')
    await wrapper.find('input[data-note-input="rule:rule1"]').setValue('Clarified')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'The draft has changed since it was reviewed. Reload and try again.',
    )
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(wrapper.emitted('update:open')).toBeUndefined()
  })

  it('surfaces the message from a 422 coverage error', async () => {
    const systemStore = useSystemStore()
    vi.spyOn(systemStore, 'createVersion').mockRejectedValue({
      type: 'unknown',
      original: { message: 'Release notes must cover exactly the semantic draft changes.' },
    })

    const wrapper = mountDialog()
    await flushPromises()

    await wrapper.find('#ver-string').setValue('0.1')
    await wrapper.find('input[data-note-input="rule:rule1"]').setValue('Clarified')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Release notes must cover exactly the semantic draft changes.',
    )
  })

  it('shows the review error and retries', async () => {
    mockGet.mockRejectedValueOnce({ type: 'network', message: 'Offline' })
    mockReview()

    const wrapper = mountDialog()
    await flushPromises()

    expect(wrapper.text()).toContain('Offline')

    const retry = wrapper.findAll('button').find((b) => b.text().trim() === 'Retry')
    await retry!.trigger('click')
    await flushPromises()

    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Pending changes')
  })

  it('asks for confirmation instead of closing when Cancel is clicked with unsaved changes', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    await wrapper.find('#ver-string').setValue('0.1')

    const cancel = wrapper.findAll('button').find((b) => b.text().trim() === 'Cancel')
    await cancel!.trigger('click')

    expect(wrapper.emitted('update:open')).toBeUndefined()
    expect(wrapper.findComponent(DiscardChangesDialog).props('open')).toBe(true)
  })

  it('closes when Cancel is clicked without unsaved changes', async () => {
    const wrapper = mountDialog()
    await flushPromises()

    const cancel = wrapper.findAll('button').find((b) => b.text().trim() === 'Cancel')
    await cancel!.trigger('click')

    expect(wrapper.emitted('update:open')).toContainEqual([false])
  })
})
