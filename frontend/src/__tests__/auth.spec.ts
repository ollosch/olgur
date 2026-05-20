import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

// ─── Mock useApi composable ───────────────────────────────────────────────────
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPatch = vi.fn()
const mockLoading = ref(false)

vi.mock('@/composables/useApi', () => ({
  useApi: vi.fn(() => ({
    get: mockGet,
    post: mockPost,
    patch: mockPatch,
    loading: mockLoading,
  })),
}))

import { useAuthStore } from '@/stores/auth'

const mockUser = {
  id: '01abc',
  name: 'Alice',
  email: 'alice@example.com',
  super_admin: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPost.mockReset()
    mockPatch.mockReset()
    mockLoading.value = false
  })

  // ── clear ────────────────────────────────────────────────────────────────────
  describe('clear', () => {
    it('sets user to null', () => {
      const auth = useAuthStore()
      auth.user = mockUser
      auth.clear()
      expect(auth.user).toBeNull()
    })
  })

  // ── fetchUser ─────────────────────────────────────────────────────────────────
  describe('fetchUser', () => {
    it('sets user on success', async () => {
      mockGet.mockResolvedValue({ ok: true, data: { data: mockUser } })
      const auth = useAuthStore()
      await auth.fetchUser()
      expect(auth.user).toEqual(mockUser)
    })

    it('calls /me endpoint', async () => {
      mockGet.mockResolvedValue({ ok: true, data: { data: mockUser } })
      const auth = useAuthStore()
      await auth.fetchUser()
      expect(mockGet).toHaveBeenCalledWith('/me')
    })

    it('calls clear when get returns ok: false (validation case)', async () => {
      mockGet.mockResolvedValue({ ok: false, errors: { _: 'error' } })
      const auth = useAuthStore()
      auth.user = mockUser
      await auth.fetchUser()
      expect(auth.user).toBeNull()
    })
  })

  // ── login ─────────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('posts to /login and fetches user on success', async () => {
      mockPost.mockResolvedValue({ ok: true, data: undefined })
      mockGet.mockResolvedValue({ ok: true, data: { data: mockUser } })

      const auth = useAuthStore()
      await auth.login({ email: 'a@b.com', password: 'secret' })

      expect(mockPost).toHaveBeenCalledWith('/login', { email: 'a@b.com', password: 'secret' })
      expect(auth.user).toEqual(mockUser)
    })

    it('does not fetch user when validation errors present', async () => {
      mockPost.mockResolvedValue({ ok: false, errors: { email: 'Invalid credentials.' } })

      const auth = useAuthStore()
      await auth.login({ email: 'a@b.com', password: 'wrong' })

      expect(mockGet).not.toHaveBeenCalled()
      expect(auth.user).toBeNull()
    })
  })

  // ── register ──────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('posts to /register and fetches user on success', async () => {
      mockPost.mockResolvedValue({ ok: true, data: undefined })
      mockGet.mockResolvedValue({ ok: true, data: { data: mockUser } })

      const auth = useAuthStore()
      await auth.register({
        name: 'Alice',
        email: 'a@b.com',
        password: 'secret123',
        password_confirmation: 'secret123',
      })

      expect(mockPost).toHaveBeenCalledWith('/register', expect.objectContaining({ email: 'a@b.com' }))
      expect(auth.user).toEqual(mockUser)
    })

    it('does not fetch user when validation errors present', async () => {
      mockPost.mockResolvedValue({ ok: false, errors: { email: 'Already taken.' } })

      const auth = useAuthStore()
      await auth.register({
        name: 'Alice',
        email: 'taken@b.com',
        password: 'secret123',
        password_confirmation: 'secret123',
      })

      expect(mockGet).not.toHaveBeenCalled()
    })
  })

  // ── logout ────────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('posts to /logout and clears user', async () => {
      mockPost.mockResolvedValue({ ok: true, data: undefined })

      const auth = useAuthStore()
      auth.user = mockUser
      await auth.logout()

      expect(mockPost).toHaveBeenCalledWith('/logout')
      expect(auth.user).toBeNull()
    })

    it('clears user even when /logout throws', async () => {
      mockPost.mockRejectedValue({ type: 'network' })

      const auth = useAuthStore()
      auth.user = mockUser

      // logout re-throws after calling clear() in finally
      try {
        await auth.logout()
      } catch {
        // expected — network error propagates
      }

      expect(auth.user).toBeNull()
    })
  })

  // ── verifyEmail ───────────────────────────────────────────────────────────────
  describe('verifyEmail', () => {
    it('calls get with the verification url and then fetches user', async () => {
      mockGet
        .mockResolvedValueOnce({ ok: true, data: undefined }) // verifyEmail GET
        .mockResolvedValueOnce({ ok: true, data: { data: mockUser } }) // fetchUser GET /me

      const auth = useAuthStore()
      await auth.verifyEmail('/verify-email/abc?expires=123&signature=xyz')

      expect(mockGet).toHaveBeenNthCalledWith(1, '/verify-email/abc?expires=123&signature=xyz')
      expect(mockGet).toHaveBeenNthCalledWith(2, '/me')
      expect(auth.user).toEqual(mockUser)
    })
  })

  // ── sendResetLink ─────────────────────────────────────────────────────────────
  describe('sendResetLink', () => {
    it('posts to /forgot-password', async () => {
      mockPost.mockResolvedValue({ ok: true, data: undefined })

      const auth = useAuthStore()
      await auth.sendResetLink({ email: 'a@b.com' })

      expect(mockPost).toHaveBeenCalledWith('/forgot-password', { email: 'a@b.com' })
    })
  })

  // ── resetPassword ─────────────────────────────────────────────────────────────
  describe('resetPassword', () => {
    it('posts to /reset-password with merged params', async () => {
      mockPost.mockResolvedValue({ ok: true, data: undefined })

      const auth = useAuthStore()
      await auth.resetPassword(
        { password: 'newpass', password_confirmation: 'newpass' },
        { token: 'tok123', email: 'a@b.com' },
      )

      expect(mockPost).toHaveBeenCalledWith('/reset-password', {
        password: 'newpass',
        password_confirmation: 'newpass',
        token: 'tok123',
        email: 'a@b.com',
      })
    })
  })

  // ── exposed state ─────────────────────────────────────────────────────────────
  it('exposes loading ref from useApi', () => {
    mockLoading.value = true
    const auth = useAuthStore()
    expect(auth.loading).toBe(true)
  })
})
