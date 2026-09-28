import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useOnline } from '@/composables/useOnline'

describe('useOnline', () => {
  beforeEach(() => {
    useOnline().online.value = true
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('probe flips online false when the connectivity check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await useOnline().probe()

    expect(useOnline().online.value).toBe(false)
  })

  it('probe restores online and notifies onOnline listeners after a disconnect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    useOnline().online.value = false
    const cb = vi.fn()
    const off = useOnline().onOnline(cb)

    await useOnline().probe()

    expect(useOnline().online.value).toBe(true)
    expect(cb).toHaveBeenCalledTimes(1)

    off()
  })

  it('does not notify onOnline listeners when already online', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const cb = vi.fn()
    const off = useOnline().onOnline(cb)

    await useOnline().probe()

    expect(cb).not.toHaveBeenCalled()

    off()
  })

  it('returns an unsubscribe function that stops notifications', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    useOnline().online.value = false
    const cb = vi.fn()
    const off = useOnline().onOnline(cb)
    off()

    await useOnline().probe()

    expect(cb).not.toHaveBeenCalled()
  })
})
