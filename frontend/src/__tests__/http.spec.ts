import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Capture the interceptor error handler via hoisted mock ───────────────────
const { capturedInterceptorError } = vi.hoisted(() => {
  let _capturedError: ((e: unknown) => Promise<unknown>) | null = null
  return {
    capturedInterceptorError: {
      get: () => _capturedError,
      set: (fn: (e: unknown) => Promise<unknown>) => {
        _capturedError = fn
      },
    },
  }
})

vi.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      response: {
        use: (_ok: unknown, errHandler: (e: unknown) => Promise<unknown>) => {
          capturedInterceptorError.set(errHandler)
        },
      },
    },
    request: vi.fn(),
    get: vi.fn(),
  }
  return {
    default: {
      create: vi.fn(() => mockInstance),
    },
  }
})

import { handleHttpErrors } from '@/lib/http'

// ─── handleHttpErrors ─────────────────────────────────────────────────────────

describe('handleHttpErrors', () => {
  it('returns auth error for status 401', () => {
    const result = handleHttpErrors(401, { message: 'Unauthenticated.' })
    expect(result).toEqual({ type: 'auth', message: 'Unauthenticated.' })
  })

  it('returns auth error with no message for 401 with no message', () => {
    const result = handleHttpErrors(401, {})
    expect(result).toEqual({ type: 'auth', message: undefined })
  })

  it('returns forbidden error for status 403', () => {
    const result = handleHttpErrors(403, { message: 'Forbidden.' })
    expect(result).toEqual({ type: 'forbidden', message: 'Forbidden.' })
  })

  it('returns validation error for status 422 with errors', () => {
    const result = handleHttpErrors(422, {
      errors: { email: ['The email field is required.'], name: 'Name is required.' },
    })
    expect(result).toEqual({
      type: 'validation',
      errors: { email: 'The email field is required.', name: 'Name is required.' },
    })
  })

  it('returns false for status 422 without errors', () => {
    const result = handleHttpErrors(422, {})
    expect(result).toBe(false)
  })

  it('returns false for an unhandled status', () => {
    const result = handleHttpErrors(500, { message: 'Server error' })
    expect(result).toBe(false)
  })

  it('returns false for undefined status', () => {
    const result = handleHttpErrors(undefined, {})
    expect(result).toBe(false)
  })

  it('maps array errors to first element', () => {
    const result = handleHttpErrors(422, {
      errors: { password: ['Too short.', 'Must include number.'] },
    })
    expect(result).toEqual({ type: 'validation', errors: { password: 'Too short.' } })
  })

  it('maps empty array errors to empty string', () => {
    const result = handleHttpErrors(422, {
      errors: { email: [] },
    })
    expect(result).toEqual({ type: 'validation', errors: { email: '' } })
  })
})

// ─── Response interceptor ─────────────────────────────────────────────────────

describe('axios response interceptor', () => {
  beforeEach(async () => {
    // Ensure http module is loaded so interceptor is registered
    await import('@/lib/http')
  })

  function makeAxiosError(status: number | undefined, data: unknown, message?: string) {
    return {
      response: status !== undefined ? { status, data } : undefined,
      message: message ?? 'error',
    }
  }

  it('rejects with auth error for 401', async () => {
    const handler = capturedInterceptorError.get()!
    await expect(handler(makeAxiosError(401, { message: 'Unauthenticated.' }))).rejects.toEqual({
      type: 'auth',
      message: 'Unauthenticated.',
    })
  })

  it('rejects with forbidden error for 403', async () => {
    const handler = capturedInterceptorError.get()!
    await expect(handler(makeAxiosError(403, { message: 'Forbidden.' }))).rejects.toEqual({
      type: 'forbidden',
      message: 'Forbidden.',
    })
  })

  it('rejects with validation error for 422', async () => {
    const handler = capturedInterceptorError.get()!
    await expect(
      handler(makeAxiosError(422, { errors: { email: ['Invalid email.'] } })),
    ).rejects.toEqual({ type: 'validation', errors: { email: 'Invalid email.' } })
  })

  it('rejects with network error when no response', async () => {
    const handler = capturedInterceptorError.get()!
    const err = { response: undefined, message: 'Network Error' }
    await expect(handler(err)).rejects.toEqual({
      type: 'network',
      message: 'Network Error',
    })
  })

  it('rejects with unknown error for unhandled status with response', async () => {
    const handler = capturedInterceptorError.get()!
    await expect(
      handler(makeAxiosError(500, { message: 'Internal Server Error' })),
    ).rejects.toEqual({ type: 'unknown', original: { message: 'Internal Server Error' } })
  })

  it('rejects with unknown error for 422 without errors field', async () => {
    const handler = capturedInterceptorError.get()!
    await expect(handler(makeAxiosError(422, {}))).rejects.toEqual({
      type: 'unknown',
      original: {},
    })
  })
})
