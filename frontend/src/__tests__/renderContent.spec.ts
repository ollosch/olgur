import { describe, it, expect } from 'vitest'
import { renderContent } from '@/lib/renderContent'

describe('renderContent', () => {
  it('returns empty string for empty input', () => {
    expect(renderContent('')).toBe('')
  })

  // ── Rule links {{L:...}} ────────────────────────────────────────────────────

  describe('rule links {{L:...}}', () => {
    it('renders a plain rule number link with data-rule-number attribute', () => {
      const html = renderContent('{{L:1.2}}')
      expect(html).toContain('data-rule-number="1.2"')
      expect(html).toContain('>1.2<')
    })

    it('renders a labeled rule link using the custom label as link text', () => {
      const html = renderContent('{{L:1.2#Custom label}}')
      expect(html).toContain('data-rule-number="1.2"')
      expect(html).toContain('>Custom label<')
      expect(html).not.toContain('#Custom')
    })

    it('renders a rule range link with data-rule-range attribute', () => {
      const html = renderContent('{{L:1.2-1.4}}')
      expect(html).toContain('data-rule-range="1.2-1.4"')
      expect(html).toContain('>1.2-1.4<')
    })

    it('renders a module-qualified link with data-rule-module and split number', () => {
      const html = renderContent('{{L:core:3.4}}')
      expect(html).toContain('data-rule-number="3.4"')
      expect(html).toContain('data-rule-module="core"')
      expect(html).toContain('>core:3.4<')
    })

    it('renders a labeled module-qualified link using the custom label', () => {
      const html = renderContent('{{L:core:3.4#See rule}}')
      expect(html).toContain('data-rule-number="3.4"')
      expect(html).toContain('data-rule-module="core"')
      expect(html).toContain('>See rule<')
    })

    it('renders a module-qualified range link', () => {
      const html = renderContent('{{L:core:1.2-1.4}}')
      expect(html).toContain('data-rule-range="1.2-1.4"')
      expect(html).toContain('data-rule-module="core"')
    })

    it('renders bare links without a per-link module context', () => {
      const html = renderContent('{{L:1.2}}')
      expect(html).toContain('data-rule-number="1.2"')
      expect(html).not.toContain('data-rule-context')
      expect(html).not.toContain('data-rule-module')
    })
  })

  // ── Acronym tokens {{A:...}} ────────────────────────────────────────────────

  describe('acronym tokens {{A:...}}', () => {
    it('renders a span with data-acronym-term attribute', () => {
      const html = renderContent('{{A:TERM}}')
      expect(html).toContain('data-acronym-term="TERM"')
      expect(html).toMatch(/<span[^>]*>TERM<\/span>/)
    })

    it('renders plain text when acronymPopups is false', () => {
      expect(renderContent('{{A:TERM}}', { acronymPopups: false })).toBe('TERM')
    })
  })

  // ── Image tokens {{I:...}} ──────────────────────────────────────────────────

  describe('image tokens {{I:...}}', () => {
    it('renders an img element pointing to the rules image endpoint', () => {
      const html = renderContent('{{I:battle-mat}}')
      expect(html).toContain('<img')
      expect(html).toContain('/rules/images/battle-mat.png')
      expect(html).toContain('alt="battle-mat"')
    })
  })

  // ── Example blocks <ex>...</ex> ─────────────────────────────────────────────

  describe('example blocks <ex>...</ex>', () => {
    it('wraps inner content in an example-block span prefixed with EX:', () => {
      const html = renderContent('<ex>Roll 2d6</ex>')
      expect(html).toContain('class="example-block"')
      expect(html).toContain('EX: Roll 2d6')
    })
  })

  // ── Unknown token prefix ────────────────────────────────────────────────────

  describe('unknown token prefix', () => {
    it('renders an unknown token type as escaped plain text', () => {
      const html = renderContent('{{Z:foo}}')
      expect(html).toContain('{{Z:foo}}')
    })
  })

  // ── Multiple tokens ─────────────────────────────────────────────────────────

  it('resolves multiple different tokens within a single string', () => {
    const html = renderContent('See {{L:1.2}} about {{A:TERM}}.')
    expect(html).toContain('data-rule-number="1.2"')
    expect(html).toContain('data-acronym-term="TERM"')
    expect(html).toContain('See ')
    expect(html).toContain(' about ')
  })
})
