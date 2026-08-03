import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
// Variables used directly inside vi.mock factory bodies must be hoisted so
// they are initialised before the mock factories run.
const { mockPush, mockToastError, mockClear } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockToastError: vi.fn(),
  mockClear: vi.fn(),
}))

// mockUser is only accessed inside inner closures (getters / method bodies),
// so a plain module-level variable is fine here.
const mockUser = { value: null as Record<string, unknown> | null }

vi.mock('@/router', () => ({
  default: { push: mockPush },
}))

vi.mock('vue-sonner', () => ({
  toast: { error: mockToastError },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    get user() {
      return mockUser.value
    },
    clear: mockClear,
  })),
}))

import { globalErrorHandler } from '@/lib/globalErrorHandler'

describe('globalErrorHandler', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPush.mockReset()
    mockToastError.mockReset()
    mockClear.mockReset()
    mockUser.value = null
  })

  // ── auth errors ─────────────────────────────────────────────────────────────

  describe('auth errors', () => {
    it('redirects to login on session expiry', async () => {
      await globalErrorHandler({ type: 'auth', message: 'Unauthenticated.' }, null)
      expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
    })

    it('redirects to home for the "Already authenticated." message', async () => {
      await globalErrorHandler({ type: 'auth', message: 'Already authenticated.' }, null)
      expect(mockPush).toHaveBeenCalledWith({ name: 'home' })
    })

    it('shows a session-expiry toast when the user was authenticated', async () => {
      mockUser.value = { id: '1', name: 'Alice' }
      await globalErrorHandler({ type: 'auth', message: 'Unauthenticated.' }, null)
      expect(mockToastError).toHaveBeenCalledWith('Your session has expired. Please log in again.')
    })

    it('does not show a toast when the user was not authenticated', async () => {
      mockUser.value = null
      await globalErrorHandler({ type: 'auth', message: 'Unauthenticated.' }, null)
      expect(mockToastError).not.toHaveBeenCalled()
    })

    it('does not show a toast for the "Already authenticated." redirect', async () => {
      await globalErrorHandler({ type: 'auth', message: 'Already authenticated.' }, null)
      expect(mockToastError).not.toHaveBeenCalled()
    })

    it('clears the auth store on session expiry', async () => {
      await globalErrorHandler({ type: 'auth', message: 'Unauthenticated.' }, null)
      expect(mockClear).toHaveBeenCalled()
    })
  })

  // ── other error types ────────────────────────────────────────────────────────

  describe('forbidden error', () => {
    it('shows a permission-denied toast', async () => {
      await globalErrorHandler({ type: 'forbidden' }, null)
      expect(mockToastError).toHaveBeenCalledWith(
        'You do not have permission to access this resource.',
      )
    })
  })

  describe('network error', () => {
    it('shows a network error toast', async () => {
      await globalErrorHandler({ type: 'network' }, null)
      expect(mockToastError).toHaveBeenCalledWith(
        'Network error. Please check your internet connection.',
      )
    })
  })

  describe('conflict error', () => {
    it('shows the error message as a toast', async () => {
      await globalErrorHandler({ type: 'conflict', message: 'This item already exists.' }, null)
      expect(mockToastError).toHaveBeenCalledWith('This item already exists.')
    })

    it('falls back to a generic message when no message is provided', async () => {
      await globalErrorHandler({ type: 'conflict' }, null)
      expect(mockToastError).toHaveBeenCalledWith('Conflict error. Please try again.')
    })
  })
})
