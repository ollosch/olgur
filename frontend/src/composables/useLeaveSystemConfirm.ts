import { ref } from 'vue'

// Module-level singleton — one instance shared across the entire app, mirrors
// the singleton pattern used by the interaction store.
const open = ref(false)
let resolver: ((confirmed: boolean) => void) | null = null

/**
 * Shows a confirmation dialog asking the user whether they really want to
 * leave the current system and return to HomeView. Resolves to `true` if
 * the user confirms, `false` if they cancel.
 */
export function requestLeaveSystemConfirmation(): Promise<boolean> {
  open.value = true
  return new Promise<boolean>((resolve) => {
    resolver = resolve
  })
}

export function useLeaveSystemConfirm() {
  function confirm(): void {
    open.value = false
    resolver?.(true)
    resolver = null
  }

  function cancel(): void {
    open.value = false
    resolver?.(false)
    resolver = null
  }

  return { open, confirm, cancel }
}
