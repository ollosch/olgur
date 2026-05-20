import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent } from 'vue'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockSendResetLink } = vi.hoisted(() => ({
  mockSendResetLink: vi.fn(),
}))

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
  sendResetLink: mockSendResetLink,
  loading: false,
}

import ResetPasswordRequestView from '@/views/Auth/ResetPasswordRequestView.vue'

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/reset-password-request',
        name: 'reset-password-request',
        component: ResetPasswordRequestView,
      },
      { path: '/login', name: 'login', component: defineComponent({ template: '<div/>' }) },
    ],
  })
}

describe('ResetPasswordRequestView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockSendResetLink.mockReset()
    mockAuthStore.loading = false
  })

  async function mountView() {
    const router = buildRouter()
    await router.push({ name: 'reset-password-request' })
    return mount(ResetPasswordRequestView, {
      global: {
        plugins: [router],
        stubs: {
          AuthLayout: defineComponent({ template: '<div><slot /></div>' }),
          RouterLink: defineComponent({ props: ['to'], template: '<a><slot /></a>' }),
        },
      },
    })
  }

  it('renders email input', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
  })

  it('renders submit button', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('calls auth.sendResetLink with email on submit', async () => {
    mockSendResetLink.mockResolvedValue({ ok: true, data: undefined })
    const wrapper = await mountView()

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockSendResetLink).toHaveBeenCalledWith({ email: 'user@example.com' })
  })

  it('calls sendResetLink once per submit', async () => {
    mockSendResetLink.mockResolvedValue({ ok: true, data: undefined })
    const wrapper = await mountView()

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockSendResetLink).toHaveBeenCalledOnce()
  })

  it('button is disabled when loading', async () => {
    mockAuthStore.loading = true
    const wrapper = await mountView()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
