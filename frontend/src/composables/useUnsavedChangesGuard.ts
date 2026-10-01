import { ref, toRef, type MaybeRefOrGetter } from 'vue'

/**
 * Guards a form dialog against closing while it has unsaved changes.
 *
 * Use `requestClose()` for every path that closes the dialog (Escape, the X
 * button, and the Cancel button). When the form is dirty it opens a
 * "discard changes?" confirmation (`confirmOpen`) instead of closing.
 */
export function useUnsavedChangesGuard(isDirty: MaybeRefOrGetter<boolean>) {
  const dirty = toRef(isDirty)
  const confirmOpen = ref(false)

  /** Returns `true` when the close may proceed; otherwise opens the confirm dialog. */
  function requestClose(): boolean {
    if (dirty.value) {
      confirmOpen.value = true
      return false
    }
    return true
  }

  return { confirmOpen, requestClose }
}
