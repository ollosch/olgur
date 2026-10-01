import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ToKillTable from '@/components/game-data/asl/ToKillTable.vue'
import type { ToKillContent } from '@/components/game-data/asl/ToKillTable.vue'

function makeContent(overrides: Partial<ToKillContent> = {}): ToKillContent {
  return {
    kind: 'to_kill',
    title: 'To Kill Tables',
    tabs: [
      {
        id: 'ap',
        label: 'AP',
        table: {
          title: 'C7.31 AP To Kill Table',
          guns: [
            { size: '@MG', basic_tk: 4, notes: ['purple'] },
            { size: 'ATR', basic_tk: 5, notes: ['red'] },
            { size: '20L', basic_tk: 6 },
          ],
          case_d: {
            rows: [
              { id: 'le25', label: '≤ 25mm' },
              { id: '37_57', label: '37-57mm' },
            ],
            ranges: [
              { id: '0_1', label: '0-1', min: 0, max: 1 },
              { id: 'ge79', label: '79+', min: 79, max: null },
            ],
            values: {
              le25: { '0_1': 2, ge79: null },
              '37_57': { '0_1': 1, ge79: null },
            },
          },
          unarmored: {
            by_caliber: [
              { band: 'IFE/MG-15mm', final_tk: 'star_vehicle' },
              { band: '100+mm', final_tk: 11 },
            ],
            critical_hit_doubles: true,
          },
          notes: ['brown 76LL: Russian/Japanese ({{L:C.7.2.2}})'],
        },
      },
      {
        id: 'heat',
        label: 'HEAT',
        table: {
          title: 'C7.33 HEAT To Kill Table',
          guns: [
            { size: '94', basic_tk: 11 },
            { size: '122', basic_tk: 17 },
          ],
          case_d: null,
          unarmored: { final_tk: 11, critical_hit_doubles: true },
        },
      },
    ],
    modifiers: [
      {
        label: 'Critical Hit: BASIC TK# × 2',
        value: '×2',
        tags: [],
        markers: [],
      },
    ],
    armor_factor: {
      af_values: [
        { af: '0*', aerial: 0 },
        { af: '14', aerial: null },
      ],
      notes: ['Subtract from MODIFIED TK# to get FINAL TK#'],
    },
    ...overrides,
  }
}

describe('ToKillTable', () => {
  it('renders a tab button per entry', () => {
    const wrapper = mount(ToKillTable, { props: { content: makeContent() } })

    const tabs = wrapper.findAll('[data-tab]')
    expect(tabs).toHaveLength(2)
    expect(tabs.map((t) => t.attributes('data-tab'))).toEqual(['ap', 'heat'])
  })

  it('renders the first tab title by default', () => {
    const wrapper = mount(ToKillTable, { props: { content: makeContent() } })

    expect(wrapper.find('[data-test="to-kill-title"]').text()).toBe('C7.31 AP To Kill Table')
  })

  it('switches tabs and keeps the shared C7.2 and AF sections', async () => {
    const wrapper = mount(ToKillTable, { props: { content: makeContent() } })

    await wrapper.find('[data-tab="heat"]').trigger('click')

    expect(wrapper.find('[data-test="to-kill-title"]').text()).toBe('C7.33 HEAT To Kill Table')
    expect(wrapper.text()).toContain('94')
    expect(wrapper.text()).toContain('17')
    expect(wrapper.text()).not.toContain('@MG')

    expect(wrapper.text()).toContain('C7.2 Basic TK# Modifications')
    expect(wrapper.text()).toContain('C7.11 Armor Factor (AF)')
    expect(wrapper.text()).toContain('×2')
    expect(wrapper.text()).toContain('Subtract from MODIFIED TK# to get FINAL TK#')
  })

  it('renders gun sizes with their basic TK#', () => {
    const wrapper = mount(ToKillTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('@MG')
    expect(wrapper.text()).toContain('ATR')
    expect(wrapper.text()).toContain('20L')
    expect(wrapper.text()).toContain('BASIC TK#')
    expect(wrapper.text()).toContain('4')
    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('6')
  })

  it('renders a colored superscript marker for a gun note', () => {
    const wrapper = mount(ToKillTable, { props: { content: makeContent() } })

    const purpleSup = wrapper
      .findAll('sup')
      .find((s) => s.classes().includes('text-purple-400'))
    expect(purpleSup).toBeDefined()
    expect(purpleSup?.text()).toBe('●')
  })

  it('renders a superscript footnote marker for a sup note', () => {
    const wrapper = mount(ToKillTable, {
      props: {
        content: makeContent({
          tabs: [
            {
              id: 'he_flame',
              label: 'HE/Flame',
              table: {
                title: 'C7.34 HE And Flame To Kill Table',
                guns: [{ size: 'FT', basic_tk: 8, final_tk: 'FT', notes: ['sup2'] }],
                case_d: null,
                unarmored: null,
              },
            },
          ],
        }),
      },
    })

    const sup = wrapper.findAll('sup').find((s) => s.text() === '2')
    expect(sup).toBeDefined()
  })

  it('renders the FINAL TK# row for the HE/Flame table', () => {
    const wrapper = mount(ToKillTable, {
      props: {
        content: makeContent({
          tabs: [
            {
              id: 'he_flame',
              label: 'HE/Flame',
              table: {
                title: 'C7.34 HE And Flame To Kill Table',
                guns: [{ size: '20+', basic_tk: 3, final_tk: '20+' }],
                case_d: null,
                unarmored: null,
              },
            },
          ],
        }),
      },
    })

    expect(wrapper.text()).toContain('FINAL TK#')
    expect(wrapper.text()).toContain('20+')
  })

  it('renders the Case D table with NA cells', () => {
    const wrapper = mount(ToKillTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('Case D TK# Change')
    expect(wrapper.text()).toContain('≤ 25mm')
    expect(wrapper.text()).toContain('79+')
    expect(wrapper.text()).toContain('+2')
    expect(wrapper.text()).toContain('NA')
  })

  it('renders the unarmored target bands', () => {
    const wrapper = mount(ToKillTable, { props: { content: makeContent() } })

    expect(wrapper.text()).toContain('Unarmored Target')
    expect(wrapper.text()).toContain('IFE/MG-15mm: star_vehicle')
    expect(wrapper.text()).toContain('100+mm: 11')
    expect(wrapper.text()).toContain('Double if Critical Hit')
  })

  it('renders the modifiers section with a rule link', () => {
    const wrapper = mount(ToKillTable, {
      props: {
        content: makeContent({
          modifiers: [
            {
              label: 'Critical Hit: BASIC TK# × 2',
              value: '×2',
              tags: [],
              markers: [],
            },
          ],
        }),
      },
    })

    expect(wrapper.text()).toContain('C7.2 Basic TK# Modifications')
    expect(wrapper.text()).toContain('×2')
  })

  it('renders the armor factor table and its notes', () => {
    const wrapper = mount(ToKillTable, {
      props: {
        content: makeContent({
          armor_factor: {
            af_values: [
              { af: '0*', aerial: 0 },
              { af: '14', aerial: null },
            ],
            notes: ['Subtract from MODIFIED TK# to get FINAL TK#'],
          },
        }),
      },
    })

    expect(wrapper.text()).toContain('C7.11 Armor Factor (AF)')
    expect(wrapper.text()).toContain('AERIAL AF')
    expect(wrapper.text()).toContain('Subtract from MODIFIED TK# to get FINAL TK#')
  })

  it('renders notes via renderContent', () => {
    const wrapper = mount(ToKillTable, { props: { content: makeContent() } })

    const link = wrapper.find('a[data-rule-number="C.7.2.2"]')
    expect(link.exists()).toBe(true)
  })

  it('highlights the active gun column when hovering a basic TK cell', async () => {
    const wrapper = mount(ToKillTable, { props: { content: makeContent() } })

    const cell = wrapper.find('td[data-col="@MG"]')
    await cell.trigger('mouseenter')

    expect(cell.classes()).toContain('bg-primary/30')

    const header = wrapper.findAll('th').find((t) => t.text().includes('@MG'))
    expect(header?.classes()).toContain('bg-primary/15')

    await cell.trigger('mouseleave')
    expect(cell.classes()).not.toContain('bg-primary/30')
  })

  it('highlights the active row and column in the Case D table', async () => {
    const wrapper = mount(ToKillTable, { props: { content: makeContent() } })

    const cell = wrapper.find('td[data-row="le25"][data-col="0_1"]')
    await cell.trigger('mouseenter')

    expect(cell.classes()).toContain('bg-primary/30')

    const rowHeader = wrapper.findAll('th').find((t) => t.text() === '≤ 25mm')
    const colHeader = wrapper.findAll('th').find((t) => t.text() === '0-1')
    expect(rowHeader?.classes()).toContain('bg-primary/15')
    expect(colHeader?.classes()).toContain('bg-primary/15')
  })
})
