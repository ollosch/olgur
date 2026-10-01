import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'

describe('useUnsavedChangesGuard', () => {
  it('closes immediately when the form is not dirty', () => {
    const dirty = ref(false)
    const { requestClose, confirmOpen } = useUnsavedChangesGuard(dirty)

    expect(requestClose()).toBe(true)
    expect(confirmOpen.value).toBe(false)
  })

  it('blocks the close and opens the confirmation when dirty', () => {
    const dirty = ref(true)
    const { requestClose, confirmOpen } = useUnsavedChangesGuard(dirty)

    expect(requestClose()).toBe(false)
    expect(confirmOpen.value).toBe(true)
  })

  it('reacts to dirty changes via a getter', () => {
    const dirty = ref(false)
    const { requestClose, confirmOpen } = useUnsavedChangesGuard(() => dirty.value)

    expect(requestClose()).toBe(true)

    dirty.value = true
    expect(requestClose()).toBe(false)
    expect(confirmOpen.value).toBe(true)

    dirty.value = false
    confirmOpen.value = false
    expect(requestClose()).toBe(true)
  })
})
