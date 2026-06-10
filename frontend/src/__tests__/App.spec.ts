import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import App from '../App.vue'
import { useAuthStore } from '@/stores/auth'

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts without errors', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
        stubs: {
          RouterView: true,
          Toaster: true,
        },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  // ── Startup loading behavior ─────────────────────────────────────────────────

  describe('startup loading state', () => {
    function mountApp() {
      const pinia = createPinia()
      setActivePinia(pinia)
      return mount(App, {
        global: {
          plugins: [pinia],
          stubs: {
            // Use a recognisable stub so we can assert presence/absence
            RouterView: defineComponent({ template: '<div data-testid="router-view" />' }),
            Toaster: true,
            // Stub complex overlays to avoid deep dependency issues
            RulePopupOverlay: true,
            GlobalSearchOverlay: true,
          },
        },
      })
    }

    it('shows a spinner while authStore.initialized is false', () => {
      const wrapper = mountApp()
      // initialized defaults to false — spinner must be visible
      expect(wrapper.find('.animate-spin').exists()).toBe(true)
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(false)
    })

    it('hides the spinner and shows router-view once initialized becomes true', async () => {
      const wrapper = mountApp()
      const authStore = useAuthStore()

      // Flip the flag that App.vue reacts to
      authStore.initialized = true
      await nextTick()

      expect(wrapper.find('.animate-spin').exists()).toBe(false)
      expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
    })
  })
})
