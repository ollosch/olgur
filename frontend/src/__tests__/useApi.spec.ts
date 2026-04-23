import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoist mock variable so vi.mock factory can reference it ──────────────────
const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }))

vi.mock('@/lib/http', () => ({
  default: {
    request: mockRequest,
  },
}))

import { useApi } from '@/composables/useApi'

describe('useApi', () => {
  beforeEach(() => {
    mockRequest.mockReset()
  })

  it('starts with loading=false and errors=null', () => {
    const { loading, errors } = useApi()
    expect(loading.value).toBe(false)
    expect(errors.value).toBeNull()
  })

  it('sets loading=true during request and false after', async () => {
    let resolveRequest!: (v: unknown) => void
    mockRequest.mockReturnValue(new Promise((r) => (resolveRequest = r)))

    const { get, loading } = useApi()
    const promise = get('/test')

    expect(loading.value).toBe(true)

    resolveRequest({ data: 'ok' })
    await promise

    expect(loading.value).toBe(false)
  })

  it('returns response data on success', async () => {
    mockRequest.mockResolvedValue({ data: { id: 1 } })
    const { get } = useApi()
    const result = await get<{ id: number }>('/test')
    expect(result).toEqual({ id: 1 })
  })

  it('captures validation errors and returns null', async () => {
    const validationError = { type: 'validation', errors: { email: 'Required.' } }
    mockRequest.mockRejectedValue(validationError)

    const { post, errors } = useApi()
    const result = await post('/login', {})

    expect(result).toBeNull()
    expect(errors.value).toEqual({ email: 'Required.' })
  })

  it('loading is false after validation error', async () => {
    mockRequest.mockRejectedValue({ type: 'validation', errors: { email: 'Bad.' } })
    const { post, loading } = useApi()
    await post('/login', {})
    expect(loading.value).toBe(false)
  })

  it('clears previous errors on new request', async () => {
    mockRequest.mockRejectedValueOnce({ type: 'validation', errors: { email: 'Bad.' } })
    mockRequest.mockResolvedValueOnce({ data: null })

    const { post, errors } = useApi()
    await post('/login', {})
    expect(errors.value).toEqual({ email: 'Bad.' })

    await post('/login', {})
    expect(errors.value).toBeNull()
  })

  it('re-throws non-validation errors', async () => {
    const authError = { type: 'auth', message: 'Unauthenticated.' }
    mockRequest.mockRejectedValue(authError)
    const { get } = useApi()
    await expect(get('/test')).rejects.toEqual(authError)
  })

  it('re-throws network errors', async () => {
    const netError = { type: 'network', message: 'Network Error' }
    mockRequest.mockRejectedValue(netError)
    const { get } = useApi()
    await expect(get('/test')).rejects.toEqual(netError)
  })

  it('loading is false after re-thrown error', async () => {
    mockRequest.mockRejectedValue({ type: 'auth' })
    const { get, loading } = useApi()
    try {
      await get('/test')
    } catch {
      // expected
    }
    expect(loading.value).toBe(false)
  })

  it('post sends correct method and data', async () => {
    mockRequest.mockResolvedValue({ data: null })
    const { post } = useApi()
    await post('/login', { email: 'a@b.com' })
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/login', method: 'POST', data: { email: 'a@b.com' } }),
    )
  })

  it('put sends correct method and data', async () => {
    mockRequest.mockResolvedValue({ data: null })
    const { put } = useApi()
    await put('/users/1', { name: 'Bob' })
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/users/1', method: 'PUT', data: { name: 'Bob' } }),
    )
  })

  it('del sends correct method', async () => {
    mockRequest.mockResolvedValue({ data: null })
    const { del } = useApi()
    await del('/users/1')
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/users/1', method: 'DELETE' }),
    )
  })

  it('get sends correct method', async () => {
    mockRequest.mockResolvedValue({ data: null })
    const { get } = useApi()
    await get('/me')
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/me', method: 'GET' }),
    )
  })
})
