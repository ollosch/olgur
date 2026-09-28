import { describe, it, expect, beforeEach } from 'vitest'
import { ref, defineComponent, nextTick, type Ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'
import { useShortcutStore } from '@/stores/shortcut'

function makeDialog(open: Ref<boolean>) {
  return defineComponent({
    setup() {
      useModalShortcutGuard(() => open.value)
    },
    template: '<div />',
  })
}

describe('useModalShortcutGuard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('releases the modal count when the dialog unmounts while open', async () => {
    const shortcutStore = useShortcutStore()
    const open = ref(false)
    const wrapper = mount(makeDialog(open))

    open.value = true
    await nextTick()
    expect(shortcutStore.modalCount).toBe(1)

    wrapper.unmount()

    expect(shortcutStore.modalCount).toBe(0)
  })

  it('does not underflow when unmounting a closed dialog', async () => {
    const shortcutStore = useShortcutStore()
    const open = ref(false)
    const wrapper = mount(makeDialog(open))

    wrapper.unmount()

    expect(shortcutStore.modalCount).toBe(0)
  })
})
