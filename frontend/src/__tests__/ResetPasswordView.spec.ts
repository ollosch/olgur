import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent } from 'vue'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockResetPassword, mockRouterPush } = vi.hoisted(() => ({
  mockResetPassword: vi.fn(),
  mockRouterPush: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

// The view imports router directly for push; mock that
vi.mock('@/router', () => ({
  default: { push: mockRouterPush },
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
vi.mock('@/components/ui/field', () => ({
  Field: defineComponent({ template: '<div><slot /></div>' }),
  FieldDescription: defineComponent({ template: '<div><slot /></div>' }),
  FieldGroup: defineComponent({ template: '<div><slot /></div>' }),
  FieldLabel: defineComponent({ template: '<label><slot /></label>' }),
}))
vi.mock('@/components/ui/input', () => ({
  Input: defineComponent({
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" v-bind="$attrs" />',
  }),
}))

const mockAuthStore = {
  resetPassword: mockResetPassword,
  loading: false,
  errors: null as Record<string, string> | null,
}

import ResetPasswordView from '@/views/Auth/ResetPasswordView.vue'

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/reset-password', name: 'reset-password', component: ResetPasswordView },
      { path: '/login', name: 'login', component: defineComponent({ template: '<div/>' }) },
    ],
  })
}

async function mountView(
  query: Record<string, string> = { token: 'tok123', email: 'user@example.com' },
) {
  const router = buildRouter()
  await router.push({ name: 'reset-password', query })
  return mount(ResetPasswordView, {
    global: {
      plugins: [router],
      stubs: {
        AuthLayout: defineComponent({ template: '<div><slot /></div>' }),
        RouterLink: defineComponent({ props: ['to'], template: '<a><slot /></a>' }),
      },
    },
  })
}

describe('ResetPasswordView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockResetPassword.mockReset()
    mockRouterPush.mockReset()
    mockAuthStore.errors = null
    mockAuthStore.loading = false
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders password and confirm password inputs when token and email present', async () => {
    const wrapper = await mountView()
    await flushPromises()
    expect(wrapper.find('input#password').exists()).toBe(true)
    expect(wrapper.find('input#confirm-password').exists()).toBe(true)
  })

  it('shows error state and schedules redirect when no token/email', async () => {
    await mountView({ token: '', email: '' })
    await flushPromises()
    vi.advanceTimersByTime(3001)
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('calls auth.resetPassword with form values and query params', async () => {
    mockResetPassword.mockResolvedValue(undefined)
    const wrapper = await mountView({ token: 'tok123', email: 'user@example.com' })
    await flushPromises()

    await wrapper.find('input#password').setValue('newpass123')
    await wrapper.find('input#confirm-password').setValue('newpass123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockResetPassword).toHaveBeenCalledWith(
      { password: 'newpass123', password_confirmation: 'newpass123' },
      { token: 'tok123', email: 'user@example.com' },
    )
  })

  it('redirects to login after successful reset', async () => {
    mockResetPassword.mockResolvedValue(undefined)
    mockAuthStore.errors = null
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('input#password').setValue('newpass123')
    await wrapper.find('input#confirm-password').setValue('newpass123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('does not redirect when reset returns validation errors', async () => {
    mockResetPassword.mockImplementation(() => {
      mockAuthStore.errors = { password: 'Too short.' }
    })
    const wrapper = await mountView()
    await flushPromises()

    await wrapper.find('input#password').setValue('short')
    await wrapper.find('input#confirm-password').setValue('short')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('button is disabled when loading', async () => {
    mockAuthStore.loading = true
    const wrapper = await mountView()
    await flushPromises()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
