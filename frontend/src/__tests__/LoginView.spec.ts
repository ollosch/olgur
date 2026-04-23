import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent } from 'vue'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockLogin, mockRouterPush } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockRouterPush: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

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
// Proper v-model stub so vee-validate field values are captured on input
vi.mock('@/components/ui/input', () => ({
  Input: defineComponent({
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" v-bind="$attrs" />',
  }),
}))

const mockAuthStore = {
  login: mockLogin,
  loading: false,
  errors: null as Record<string, string> | null,
  user: null as Record<string, unknown> | null,
}

import LoginView from '@/views/Auth/LoginView.vue'

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      { path: '/register', name: 'register', component: defineComponent({ template: '<div/>' }) },
      {
        path: '/reset-password-request',
        name: 'reset-password-request',
        component: defineComponent({ template: '<div/>' }),
      },
      {
        path: '/',
        name: 'home',
        component: defineComponent({ template: '<div/>' }),
      },
    ],
  })
}

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockLogin.mockReset()
    mockRouterPush.mockReset()
    mockAuthStore.errors = null
    mockAuthStore.loading = false
    mockAuthStore.user = null
  })

  function mountView() {
    const router = buildRouter()
    return mount(LoginView, {
      global: {
        plugins: [router],
        stubs: {
          AuthLayout: defineComponent({ template: '<div><slot /></div>' }),
          RouterLink: defineComponent({
            props: ['to'],
            template: '<a><slot /></a>',
          }),
        },
      },
    })
  }

  it('renders email and password inputs', () => {
    const wrapper = mountView()
    expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
  })

  it('renders login button', () => {
    const wrapper = mountView()
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
  })

  it('calls auth.login with form values on submit', async () => {
    mockLogin.mockResolvedValue(undefined)
    const wrapper = mountView()

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  it('redirects to home after successful login', async () => {
    mockLogin.mockResolvedValue(undefined)
    mockAuthStore.errors = null
    const wrapper = mountView()

    await wrapper.find('input[type="email"]').setValue('user@example.com')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'home' })
  })

  it('does not redirect when login returns errors', async () => {
    mockLogin.mockImplementation(() => {
      mockAuthStore.errors = { email: 'Invalid credentials.' }
    })
    const wrapper = mountView()

    await wrapper.find('input[type="email"]').setValue('bad@example.com')
    await wrapper.find('input[type="password"]').setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('button is disabled when loading is true', async () => {
    mockAuthStore.loading = true
    const wrapper = mountView()
    const btn = wrapper.find('button[type="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })
})
