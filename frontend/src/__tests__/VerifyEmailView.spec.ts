import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent } from 'vue'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockVerifyEmail } = vi.hoisted(() => ({ mockVerifyEmail: vi.fn() }))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

vi.mock('@/components/ui/button', () => ({
  Button: defineComponent({ template: '<button v-bind="$attrs"><slot /></button>' }),
}))
vi.mock('@/components/ui/card', () => ({
  Card: defineComponent({ template: '<div><slot /></div>' }),
  CardContent: defineComponent({ template: '<div><slot /></div>' }),
  CardDescription: defineComponent({ template: '<div><slot /></div>' }),
  CardHeader: defineComponent({ template: '<div><slot /></div>' }),
  CardTitle: defineComponent({ template: '<div><slot /></div>' }),
}))

const mockAuthStore = {
  verifyEmail: mockVerifyEmail,
}

import VerifyEmailView from '@/views/Auth/VerifyEmailView.vue'

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/verify-email', name: 'verify-email', component: VerifyEmailView },
      { path: '/login', name: 'login', component: defineComponent({ template: '<div/>' }) },
      { path: '/systems', name: 'systems', component: defineComponent({ template: '<div/>' }) },
    ],
  })
}

async function mountView(query: Record<string, string> = {}) {
  const router = buildRouter()
  await router.push({ name: 'verify-email', query })
  return mount(VerifyEmailView, {
    global: {
      plugins: [router],
      stubs: { AuthLayout: defineComponent({ template: '<div><slot /></div>' }) },
    },
  })
}

describe('VerifyEmailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockVerifyEmail.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows verifying state initially (before onMounted resolves)', async () => {
    // Never resolves so stays in verifying state
    mockVerifyEmail.mockReturnValue(new Promise(() => { }))
    const wrapper = await mountView({ url: '/email/verify/123?expires=123&signature=abc' })
    expect(wrapper.text()).toContain('Verifying')
  })

  it('shows error state when no url query param', async () => {
    const wrapper = await mountView({})
    await flushPromises()
    expect(wrapper.text()).toContain('Invalid verification link')
  })

  it('shows success state after successful verification', async () => {
    mockVerifyEmail.mockResolvedValue(undefined)
    const wrapper = await mountView({ url: '/email/verify/123?expires=123&signature=abc' })
    await flushPromises()
    expect(wrapper.text()).toContain('verified successfully')
  })

  it('shows error state when verifyEmail throws', async () => {
    mockVerifyEmail.mockRejectedValue({ type: 'unknown' })
    const wrapper = await mountView({ url: '/email/verify/123?expires=123&signature=abc' })
    await flushPromises()
    expect(wrapper.text()).toContain('Failed to verify email')
  })

  it('goToLogin navigates to login route on button click in error state', async () => {
    mockVerifyEmail.mockRejectedValue({ type: 'unknown' })
    const router = buildRouter()
    await router.push({ name: 'verify-email', query: { url: '/email/verify/123' } })
    const pushSpy = vi.spyOn(router, 'push')

    const wrapper = mount(VerifyEmailView, {
      global: {
        plugins: [router],
        stubs: { AuthLayout: defineComponent({ template: '<div><slot /></div>' }) },
      },
    })

    await flushPromises()
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(pushSpy).toHaveBeenCalledWith({ name: 'login' })
  })
})
