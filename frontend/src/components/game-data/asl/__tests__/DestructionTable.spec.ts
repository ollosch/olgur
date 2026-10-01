import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DestructionTable from '@/components/game-data/asl/DestructionTable.vue'
import type { DestructionContent } from '@/components/game-data/asl/DestructionTable.vue'

function makeContent(overrides: Partial<DestructionContent> = {}): DestructionContent {
  return {
    kind: 'destruction',
    title: 'Destruction Tables',
    tabs: [
      {
        id: 'unarmored_vehicle',
        label: 'Unarmored Vehicle',
        table: {
          title: 'Unarmored Vehicle Destruction Table',
          attack_types: [
            { id: 'direct_fire', label: 'Bomb/Ordnance Direct Fire' },
            { id: 'ft_mol', label: 'FT/MOL' },
          ],
          outcome_rows: [
            { id: 'le_half', label: '≤ Half TK#' },
            { id: 'lt_tk', label: '< TK#' },
          ],
          cells: {
            le_half: { direct_fire: 'Burn', ft_mol: 'Burn' },
            lt_tk: { direct_fire: 'Elim', ft_mol: 'Burn' },
          },
          notes: ['1: > KIA = Elim ({{L:B.28.5.2}})'],
        },
      },
      {
        id: 'gun',
        label: 'Gun',
        table: {
          title: 'C11.6 Gun Destruction Table',
          attack_types: [{ id: 'ordnance', label: 'Ordnance Bomb/OBA' }],
          outcome_rows: [{ id: 'le_kia', label: '≤ Final KIA', markers: ['4'] }],
          cells: {
            le_kia: { ordnance: 'Elim' },
          },
          notes: ['Elim: Gun and manning Infantry are eliminated'],
        },
      },
    ],
    ...overrides,
  }
}

describe('DestructionTable', () => {
  it('renders a tab button per tab', () => {
    const wrapper = mount(DestructionTable, { props: { content: makeContent() } })

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]?.text()).toContain('Unarmored Vehicle')
    expect(tabs[1]?.text()).toContain('Gun')
  })

  it('renders the first tab table by default', () => {
    const wrapper = mount(DestructionTable, { props: { content: makeContent() } })

    expect(wrapper.find('[data-test="destruction-title"]').text()).toBe(
      'Unarmored Vehicle Destruction Table',
    )
    expect(wrapper.text()).toContain('Bomb/Ordnance Direct Fire')
    expect(wrapper.text()).toContain('Burn')
  })

  it('switches tables when a tab is clicked', async () => {
    const wrapper = mount(DestructionTable, { props: { content: makeContent() } })

    await wrapper.find('[data-tab="gun"]').trigger('click')

    expect(wrapper.find('[data-test="destruction-title"]').text()).toBe(
      'C11.6 Gun Destruction Table',
    )
    expect(wrapper.text()).toContain('Ordnance Bomb/OBA')
    expect(wrapper.text()).toContain('≤ Final KIA')
  })

  it('renders a row marker superscript', () => {
    const wrapper = mount(DestructionTable, {
      props: {
        content: makeContent({
          tabs: [
            {
              id: 'gun',
              label: 'Gun',
              table: {
                title: 'C11.6 Gun Destruction Table',
                attack_types: [{ id: 'ordnance', label: 'Ordnance Bomb/OBA' }],
                outcome_rows: [{ id: 'le_kia', label: '≤ Final KIA', markers: ['4'] }],
                cells: { le_kia: { ordnance: 'Elim' } },
                notes: [],
              },
            },
          ],
        }),
      },
    })

    expect(wrapper.text()).toContain('≤ Final KIA')
    const sup = wrapper.findAll('sup').find((s) => s.text() === '4')
    expect(sup).toBeDefined()
  })

  it('renders hull and turret superscripts for an Im/Sh cell', () => {
    const wrapper = mount(DestructionTable, {
      props: {
        content: makeContent({
          tabs: [
            {
              id: 'afv',
              label: 'AFV',
              table: {
                title: 'C7.2 AFV Destruction Table',
                attack_types: [{ id: 'direct_fire', label: 'Bomb/Direct Fire' }],
                outcome_rows: [{ id: 'eq_tk', label: '= TK#' }],
                cells: {
                  eq_tk: { direct_fire: { value: 'Im/Sh', hull: 'H', turret: 'T' } },
                },
                notes: ['H/T: Hull Hit / Turret Hit'],
              },
            },
          ],
        }),
      },
    })

    expect(wrapper.text()).toContain('Im/Sh')
    const hull = wrapper.findAll('sup').find((s) => s.text() === 'H')
    const turret = wrapper.findAll('sup').find((s) => s.text() === 'T')
    expect(hull).toBeDefined()
    expect(turret).toBeDefined()
  })

  it('renders notes via renderContent', () => {
    const wrapper = mount(DestructionTable, { props: { content: makeContent() } })

    const link = wrapper.find('a[data-rule-number="B.28.5.2"]')
    expect(link.exists()).toBe(true)
  })

  it('highlights the active row and column when hovering a cell', async () => {
    const wrapper = mount(DestructionTable, { props: { content: makeContent() } })

    const cell = wrapper.find('td[data-row="le_half"][data-col="direct_fire"]')
    await cell.trigger('mouseenter')

    expect(cell.classes()).toContain('bg-primary/30')

    const colHeader = wrapper.findAll('th').find((t) => t.text() === 'Bomb/Ordnance Direct Fire')
    expect(colHeader?.classes()).toContain('bg-primary/15')

    await cell.trigger('mouseleave')
    expect(cell.classes()).not.toContain('bg-primary/30')
  })
})
