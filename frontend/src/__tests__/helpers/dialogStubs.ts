import { defineComponent, type Component } from 'vue'

/**
 * Minimal stubs for the reka-ui-backed UI primitives used by the dialogs under
 * test. Each passthrough renders its slot in place so assertions can target the
 * dialog's own markup without a teleport or portal.
 */
function passthrough(name: string): Component {
  return defineComponent({
    name,
    template: '<div><slot /></div>',
  })
}

const Button: Component = defineComponent({
  name: 'ButtonStub',
  inheritAttrs: false,
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
})

export function dialogStubs(): Record<string, Component> {
  return {
    Dialog: passthrough('Dialog'),
    DialogContent: passthrough('DialogContent'),
    DialogHeader: passthrough('DialogHeader'),
    DialogTitle: passthrough('DialogTitle'),
    DialogDescription: passthrough('DialogDescription'),
    DialogFooter: passthrough('DialogFooter'),
    Label: passthrough('Label'),
    Button,
  }
}
