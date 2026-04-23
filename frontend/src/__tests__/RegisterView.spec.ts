import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { defineComponent } from 'vue'

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockRegister, mockRouterPush, mockToastSuccess } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
  mockRouterPush: vi.fn(),
  mockToastSuccess: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

vi.mock('@/router', () => ({
  default: { push: mockRouterPush },
}))

vi.mock('vue-sonner', () => ({
  toast: { success: mockToastSuccess, error: vi.fn() },
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
  register: mockRegister,
  loading: false,
  errors: null as Record<string, string> | null,
}

import RegisterView from '@/views/Auth/RegisterView.vue'

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/register', name: 'register', component: RegisterView },
      { path: '/login', name: 'login', component: defineComponent({ template: '<div/>' }) },
      { path: '/', name: 'home', component: defineComponent({ template: '<div/>' }) },
    ],
  })
}

describe('RegisterView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRegister.mockReset()
    mockRouterPush.mockReset()
    mockToastSuccess.mockReset()
    mockAuthStore.errors = null
    mockAuthStore.loading = false
  })

  function mountView() {
    const router = buildRouter()
    return mount(RegisterView, {
      global: {
        plugins: [router],
        stubs: {
          AuthLayout: defineComponent({ template: '<div><slot /></div>' }),
          RouterLink: defineComponent({ props: ['to'], template: '<a><slot /></a>' }),
        },
      },
    })
  }

  it('renders name, email, password, and confirm-password inputs', () => {
    const wrapper = mountView()
    expect(wrapper.find('input#name').exists()).toBe(true)
    expect(wrapper.find('input#email').exists()).toBe(true)
    expect(wrapper.find('input#password').exists()).toBe(true)
    expect(wrapper.find('input#confirm-password').exists()).toBe(true)
  })

  it('calls auth.register with form values on submit', async () => {
    mockRegister.mockResolvedValue(undefined)
    const wrapper = mountView()

    await wrapper.find('input#name').setValue('Alice')
    await wrapper.find('input#email').setValue('alice@example.com')
    await wrapper.find('input#password').setValue('password123')
    await wrapper.find('input#confirm-password').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockRegister).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
      password_confirmation: 'password123',
    })
  })

  it('shows success toast and redirects to home after successful registration', async () => {
    mockRegister.mockResolvedValue(undefined)
    mockAuthStore.errors = null
    const wrapper = mountView()

    await wrapper.find('input#name').setValue('Alice')
    await wrapper.find('input#email').setValue('alice@example.com')
    await wrapper.find('input#password').setValue('password123')
    await wrapper.find('input#confirm-password').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockToastSuccess).toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'home' })
  })

  it('does not redirect when register returns errors', async () => {
    mockRegister.mockImplementation(() => {
      mockAuthStore.errors = { email: 'Already taken.' }
    })
    const wrapper = mountView()

    await wrapper.find('input#name').setValue('Alice')
    await wrapper.find('input#email').setValue('taken@example.com')
    await wrapper.find('input#password').setValue('password123')
    await wrapper.find('input#confirm-password').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })

  it('button is disabled when loading is true', () => {
    mockAuthStore.loading = true
    const wrapper = mountView()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
