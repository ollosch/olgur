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

describe('renderContent security and markdown', () => {
  it('escapes script tags into visible text', () => {
    const html = renderContent('<script>alert(1)</script>')
    expect(html).not.toContain('<script')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes raw HTML so event handlers are inert', () => {
    const html = renderContent('<img src="x" onerror="alert(1)">')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('escapes svg payloads into visible text', () => {
    const html = renderContent('<svg onload="alert(1)"><circle /></svg>')
    expect(html).not.toContain('<svg')
    expect(html).toContain('&lt;svg')
  })

  it('does not produce a javascript: link from markdown', () => {
    const html = renderContent('[click](javascript:alert(1))')
    expect(html).not.toMatch(/<a[^>]+href=/)
  })

  it('escapes payloads nested inside example blocks', () => {
    const html = renderContent('<ex><img src="x" onerror="alert(1)"></ex>')
    expect(html).toContain('example-block')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('renders inline markdown emphasis', () => {
    const html = renderContent('This is **bold** and *italic*.')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('renders block markdown only when block mode is requested', () => {
    expect(renderContent('## Heading')).not.toContain('<h2>')
    expect(renderContent('## Heading', { block: true })).toContain('<h2>Heading</h2>')
  })

  it('renders whitelisted color tags without allowing arbitrary styles', () => {
    const html = renderContent('[color:red]red text[/color]')
    expect(html).toContain('class="text-red-400"')
    expect(html).toContain('red text')
    expect(html).not.toContain('style=')
  })

  it('leaves unknown color names as plain text', () => {
    const html = renderContent('[color:url(javascript:alert(1))]x[/color]')
    expect(html).not.toContain('style=')
    expect(html).not.toContain('<span')
  })

  it('escapes HTML in token labels', () => {
    const html = renderContent('{{L:1.2#<img src=x onerror=alert(1)>}}')
    expect(html).not.toContain('<img')
    expect(html).not.toMatch(/<[^>]+onerror/i)
  })

  it('preserves delegation data attributes through sanitization', () => {
    const html = renderContent('{{L:1.2}} {{A:TERM}}')
    expect(html).toContain('data-rule-number="1.2"')
    expect(html).toContain('data-acronym-term="TERM"')
  })
})

describe('renderContent extended Markdown', () => {
  it('renders underscore emphasis', () => {
    const html = renderContent('This is __bold__ and _italic_.')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('renders caret superscript, including escaped spaces', () => {
    expect(renderContent('^1^')).toContain('<sup>1</sup>')
    expect(renderContent('^3\\ 4^')).toContain('<sup>3 4</sup>')
  })

  it('renders [u] as underline', () => {
    expect(renderContent('[u]75[/u]')).toContain('<u>75</u>')
  })

  it('renders [o] as overline', () => {
    const html = renderContent('[o]75[/o]')
    expect(html).toContain('class="rule-overline"')
    expect(html).toContain('75')
  })

  it('renders [ex] as a block example with nested tokens', () => {
    const html = renderContent('[ex]See [u]this[/u] and __that__.[/ex]', { block: true })
    expect(html).toContain('class="example-block"')
    expect(html).toContain('EX:')
    expect(html).toContain('<u>this</u>')
    expect(html).toContain('<strong>that</strong>')
  })

  it('renders block Markdown inside [ex]', () => {
    const html = renderContent('[ex]\n- one\n- two\n[/ex]', { block: true })
    expect(html).toContain('class="example-block"')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>one</li>')
  })

  it('dedents [ex] inside a list item', () => {
    const content = '- item\n\n  [ex]\n  example block\n  [/ex]'
    const html = renderContent(content, { block: true })
    expect(html).toContain('class="example-block"')
    expect(html).not.toContain('<pre>')
    expect(html).not.toContain('<code>')
  })

  it('renders GFM pipe tables', () => {
    const html = renderContent('| a | b |\n| --- | --- |\n| 1 | 2 |', { block: true })
    expect(html).toContain('<table>')
    expect(html).toContain('<th>a</th>')
    expect(html).toContain('<td>1</td>')
  })

  it('does not convert escaped [ex] text', () => {
    const html = renderContent('\\[ex\\]not an example\\[/ex\\]', { block: true })
    expect(html).not.toContain('example-block')
    expect(html).toContain('[ex]')
  })

  it('keeps the legacy <ex> tag working', () => {
    const html = renderContent('<ex>legacy</ex>')
    expect(html).toContain('example-block')
    expect(html).toContain('EX: legacy')
  })
})
