import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnnotationMarker from '@/components/game-data/AnnotationMarker.vue'

describe('AnnotationMarker', () => {
  it('renders a plain sup when no text is provided', () => {
    const wrapper = mount(AnnotationMarker, { props: { marker: '†' } })

    const sup = wrapper.find('sup')
    expect(sup.exists()).toBe(true)
    expect(sup.text()).toBe('†')
    expect(sup.classes()).toContain('text-primary')
    expect(sup.attributes('data-annotation')).toBeUndefined()
  })

  it('renders a plain sup when an empty text is provided', () => {
    const wrapper = mount(AnnotationMarker, { props: { marker: '†', text: '' } })

    const sup = wrapper.find('sup')
    expect(sup.exists()).toBe(true)
    expect(sup.attributes('data-annotation')).toBeUndefined()
  })

  it('carries the footnote text in a data-annotation attribute when text is provided', () => {
    const wrapper = mount(AnnotationMarker, {
      props: { marker: '†', text: 'EXC: see {{L:C.1.1}}' },
    })

    const sup = wrapper.find('sup')
    expect(sup.exists()).toBe(true)
    expect(sup.text()).toBe('†')
    expect(sup.attributes('data-annotation')).toBe('EXC: see {{L:C.1.1}}')
    expect(sup.classes()).toContain('cursor-help')
  })

  it('escapes the footnote text when rendering the attribute', () => {
    const wrapper = mount(AnnotationMarker, {
      props: { marker: '†', text: '<script>alert("x")</script>' },
    })

    const sup = wrapper.find('sup')
    expect(sup.attributes('data-annotation')).toBe('<script>alert("x")</script>')
    expect(wrapper.find('script').exists()).toBe(false)
  })
})
