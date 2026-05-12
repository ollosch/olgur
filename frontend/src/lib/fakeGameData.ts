/**
 * Fake game data for development / preview.
 * Used by GameDataDrawer when the content store has no real data loaded.
 * Delete this file once real data is imported.
 */

import type { MatrixContent } from '@/components/game-data/MatrixTable.vue'
import type { AttributeTableContent } from '@/components/game-data/AttributeTable.vue'
import type { ModifierListContent } from '@/components/game-data/ModifierList.vue'
import type { SopContent } from '@/components/game-data/SopViewer.vue'

export const fakeIft: MatrixContent = {
  kind: 'matrix',
  title: 'Infantry Fire Table',
  row_header: 'DR',
  col_header: 'FP',
  columns: [
    { id: 'fp1', label: '1', annotations: ['ATR'] },
    { id: 'fp2', label: '2', annotations: [] },
    { id: 'fp4', label: '4', annotations: [] },
    { id: 'fp6', label: '6', annotations: [] },
    { id: 'fp8', label: '8', annotations: [] },
    { id: 'fp12', label: '12', annotations: ['FT'] },
    { id: 'fp16', label: '16', annotations: ['FT'] },
    { id: 'fp20', label: '20', annotations: ['FT'] },
    { id: 'fp24', label: '24', annotations: ['FT'] },
    { id: 'fp30', label: '30', annotations: ['FT'] },
  ],
  rows: [
    { id: 'dr2', label: '2' },
    { id: 'dr3', label: '3' },
    { id: 'dr4', label: '4' },
    { id: 'dr5', label: '5' },
    { id: 'dr6', label: '6' },
    { id: 'dr7', label: '7' },
    { id: 'dr8', label: '8' },
    { id: 'dr9', label: '9' },
    { id: 'dr10', label: '10' },
    { id: 'dr11', label: '11' },
    { id: 'dr12', label: '12' },
  ],
  cells: {
    dr2: { fp1: { value: '-' }, fp2: { value: 'NMC', style: 'green' }, fp4: { value: 'NMC', style: 'green' }, fp6: { value: '1MC', style: 'green' }, fp8: { value: '1MC', style: 'green' }, fp12: { value: '2MC', style: 'yellow' }, fp16: { value: '2MC', style: 'yellow' }, fp20: { value: 'KIA', style: 'red' }, fp24: { value: 'KIA', style: 'red' }, fp30: { value: 'KIA', style: 'red' } },
    dr3: { fp1: { value: '-' }, fp2: { value: '-' }, fp4: { value: 'NMC', style: 'green' }, fp6: { value: 'NMC', style: 'green' }, fp8: { value: '1MC', style: 'green' }, fp12: { value: '1MC', style: 'green' }, fp16: { value: '2MC', style: 'yellow' }, fp20: { value: '2MC', style: 'yellow' }, fp24: { value: 'KIA', style: 'red' }, fp30: { value: 'KIA', style: 'red' } },
    dr4: { fp1: { value: '-' }, fp2: { value: '-' }, fp4: { value: '-' }, fp6: { value: 'NMC', style: 'green' }, fp8: { value: 'NMC', style: 'green' }, fp12: { value: '1MC', style: 'green' }, fp16: { value: '1MC', style: 'green' }, fp20: { value: '2MC', style: 'yellow' }, fp24: { value: '2MC', style: 'yellow' }, fp30: { value: 'KIA', style: 'red' } },
    dr5: { fp1: { value: '-' }, fp2: { value: '-' }, fp4: { value: '-' }, fp6: { value: '-' }, fp8: { value: 'NMC', style: 'green' }, fp12: { value: 'NMC', style: 'green' }, fp16: { value: '1MC', style: 'green' }, fp20: { value: '1MC', style: 'green' }, fp24: { value: '2MC', style: 'yellow' }, fp30: { value: '2MC', style: 'yellow' } },
    dr6: { fp1: { value: '-' }, fp2: { value: '-' }, fp4: { value: '-' }, fp6: { value: '-' }, fp8: { value: '-' }, fp12: { value: 'NMC', style: 'green' }, fp16: { value: 'NMC', style: 'green' }, fp20: { value: '1MC', style: 'green' }, fp24: { value: '1MC', style: 'green' }, fp30: { value: '2MC', style: 'yellow' } },
    dr7: { fp1: { value: '-' }, fp2: { value: '-' }, fp4: { value: '-' }, fp6: { value: '-' }, fp8: { value: '-' }, fp12: { value: '-' }, fp16: { value: 'NMC', style: 'green' }, fp20: { value: 'NMC', style: 'green' }, fp24: { value: '1MC', style: 'green' }, fp30: { value: '1MC', style: 'green' } },
    dr8: { fp1: { value: '-' }, fp2: { value: '-' }, fp4: { value: '-' }, fp6: { value: '-' }, fp8: { value: '-' }, fp12: { value: '-' }, fp16: { value: '-' }, fp20: { value: 'NMC', style: 'green' }, fp24: { value: 'NMC', style: 'green' }, fp30: { value: '1MC', style: 'green' } },
    dr9: { fp1: { value: '-' }, fp2: { value: '-' }, fp4: { value: '-' }, fp6: { value: '-' }, fp8: { value: '-' }, fp12: { value: '-' }, fp16: { value: '-' }, fp20: { value: '-' }, fp24: { value: 'NMC', style: 'green' }, fp30: { value: 'NMC', style: 'green' } },
    dr10: { fp1: { value: '-' }, fp2: { value: '-' }, fp4: { value: '-' }, fp6: { value: '-' }, fp8: { value: '-' }, fp12: { value: '-' }, fp16: { value: '-' }, fp20: { value: '-' }, fp24: { value: '-' }, fp30: { value: 'NMC', style: 'green' } },
    dr11: { fp1: { value: '-' }, fp2: { value: '-' }, fp4: { value: '-' }, fp6: { value: '-' }, fp8: { value: '-' }, fp12: { value: '-' }, fp16: { value: '-' }, fp20: { value: '-' }, fp24: { value: '-' }, fp30: { value: '-' } },
    dr12: { fp1: { value: 'KIA', style: 'red', markers: ['A'] }, fp2: { value: 'KIA', style: 'red' }, fp4: { value: 'KIA', style: 'red' }, fp6: { value: 'KIA', style: 'red' }, fp8: { value: 'KIA', style: 'red' }, fp12: { value: 'KIA', style: 'red' }, fp16: { value: 'KIA', style: 'red' }, fp20: { value: 'KIA', style: 'red' }, fp24: { value: 'KIA', style: 'red' }, fp30: { value: 'KIA', style: 'red' } },
  },
  footnotes: {
    A: { text: 'Original: Sniper check. See {{L:A14.3}}.', style: 'green' },
  },
}

export const fakeTec: AttributeTableContent = {
  kind: 'attribute_table',
  title: 'Terrain Effects Chart',
  columns: [
    { id: 'hindrance', label: 'Hind.', tags: [] },
    { id: 'tem', label: 'TEM', tags: [] },
    { id: 'inf_mf', label: 'Inf MF', tags: [] },
    { id: 'veh_mp', label: 'Veh MP', tags: ['vehicles'] },
    { id: 'sw_mf', label: 'SW MF', tags: ['sw'] },
  ],
  rows: [
    { id: 'open', label: 'Open Ground', tags: [], cells: { hindrance: { value: '-' }, tem: { value: '0' }, inf_mf: { value: '1' }, veh_mp: { value: '2' }, sw_mf: { value: '1' } } },
    { id: 'road', label: 'Road', tags: [], cells: { hindrance: { value: '-' }, tem: { value: '0' }, inf_mf: { value: '½' }, veh_mp: { value: '1' }, sw_mf: { value: '½' } } },
    { id: 'brush', label: 'Brush', tags: [], cells: { hindrance: { value: '1' }, tem: { value: '+1' }, inf_mf: { value: '2' }, veh_mp: { value: '4' }, sw_mf: { value: '2' } } },
    { id: 'woods', label: 'Woods', tags: ['woods'], cells: { hindrance: { value: '1', markers: ['1'] }, tem: { value: '+1' }, inf_mf: { value: '2' }, veh_mp: { value: '4', markers: ['A'] }, sw_mf: { value: '3' } } },
    { id: 'orchard', label: 'Orchard', tags: ['woods'], cells: { hindrance: { value: '1' }, tem: { value: '+1' }, inf_mf: { value: '1½' }, veh_mp: { value: '3' }, sw_mf: { value: '2' } } },
    { id: 'stream', label: 'Stream', tags: [], cells: { hindrance: { value: '-' }, tem: { value: '0' }, inf_mf: { value: '2' }, veh_mp: { value: 'P' }, sw_mf: { value: '2' } } },
    { id: 'river', label: 'River', tags: [], cells: { hindrance: { value: '-' }, tem: { value: '0' }, inf_mf: { value: 'P' }, veh_mp: { value: 'P' }, sw_mf: { value: 'P' } } },
    { id: 'building', label: 'Building (stone)', tags: [], cells: { hindrance: { value: '-' }, tem: { value: '+3' }, inf_mf: { value: '2' }, veh_mp: { value: 'N' }, sw_mf: { value: '2' } } },
    { id: 'rubble', label: 'Rubble', tags: [], cells: { hindrance: { value: '-' }, tem: { value: '+2' }, inf_mf: { value: '3' }, veh_mp: { value: 'N' }, sw_mf: { value: '3' } } },
    { id: 'slope', label: 'Slope', tags: [], cells: { hindrance: { value: '-' }, tem: { value: '+1' }, inf_mf: { value: '2' }, veh_mp: { value: '3' }, sw_mf: { value: '2' } } },
    { id: 'crest', label: 'Crest', tags: [], cells: { hindrance: { value: '-' }, tem: { value: '+1' }, inf_mf: { value: '0' }, veh_mp: { value: '0' }, sw_mf: { value: '0' } } },
    { id: 'wall', label: 'Wall/Hedge', tags: [], cells: { hindrance: { value: '-' }, tem: { value: '+1' }, inf_mf: { value: '1' }, veh_mp: { value: 'P' }, sw_mf: { value: '1' } } },
    { id: 'trench', label: 'Trench', tags: [], cells: { hindrance: { value: '-' }, tem: { value: '+2' }, inf_mf: { value: '2' }, veh_mp: { value: 'N' }, sw_mf: { value: '2' } } },
  ],
  footnotes: {
    '1': { text: 'Applies only in Season {{L:E3.1}}.' },
    A: { text: 'Half if on a road {{L:B3.2}}.', style: 'green' },
  },
}

export const fakeMoraleModifiers: ModifierListContent = {
  kind: 'modifier_list',
  title: 'Morale Check DRM',
  columns: ['Condition', 'DRM'],
  entries: [
    { label: 'Leader present (same location)', value: '+1', tags: [], markers: [] },
    { label: 'Leader with higher morale rating', value: '+2', tags: [], markers: [] },
    { label: 'Hero', value: '+1', tags: [], markers: [] },
    { label: 'Berserk unit', value: '+2', tags: [], markers: [] },
    { label: 'Elite unit (morale 9+)', value: '+1', tags: [], markers: [] },
    { label: 'Green unit (morale 6-)', value: '-1', tags: [], markers: [] },
    { label: 'Disrupted', value: '-1', tags: [], markers: [] },
    { label: 'Cowering', value: '-1', tags: [], markers: [] },
    { label: 'Japanese Fanatic', value: '+2', tags: ['japanese'], markers: ['1'] },
    { label: 'Night (ELR ≥ 4)', value: '-1', tags: ['night'], markers: [] },
    { label: 'Night (ELR ≤ 3)', value: '-2', tags: ['night'], markers: [] },
    { label: 'Starshell illuminated', value: '+1', tags: ['night'], markers: [] },
  ],
  footnotes: {
    '1': { text: 'See {{L:A10.8}} for qualification conditions.' },
  },
}

export const fakeSop: SopContent = {
  kind: 'sop',
  title: 'Sequence of Play',
  phases: [
    {
      id: 'rally',
      label: 'Rally Phase',
      sections: [
        {
          id: 'rally-start',
          label: 'Start',
          steps: [
            { id: 'rally-s1', label: 'Remove Prep Fire markers', clauses: [{ text: 'Both sides remove all Prep Fire (PF) markers from their units.' }] },
          ],
        },
        {
          id: 'rally-during',
          label: 'During',
          steps: [
            { id: 'rally-d1', label: 'Repair / Recover SW', clauses: [{ text: 'Attempt to repair Malfunctioned SW (A9.72) or recover SW from adjacent hex.' }] },
            {
              id: 'rally-d2', label: 'Rally broken units', clauses: [
                { text: 'Roll for each broken unit: ≤ current morale → rallied; place upright.' },
                { text: 'Wounded leader DRM −1 applies to self-rally only.', tag: 'leader' },
              ]
            },
            {
              id: 'rally-d3', label: 'Self-rally', clauses: [
                { text: 'Heroic / 1st-line unit with no leader: attempt self-rally at −1 DRM.' },
              ]
            },
          ],
        },
        {
          id: 'rally-end',
          label: 'End',
          steps: [
            { id: 'rally-e1', label: 'Remove Desperation Morale markers', clauses: [{ text: 'Remove DM markers from rallied units.' }] },
          ],
        },
      ],
    },
    {
      id: 'prep',
      label: 'Prep Fire Phase (Phasing)',
      sections: [
        {
          id: 'prep-during',
          label: 'During',
          steps: [
            { id: 'prep-d1', label: 'Declare Prep Fire', clauses: [{ text: 'Phasing player fires any non-moving units (place PF marker).' }] },
            { id: 'prep-d2', label: 'Resolve fire', clauses: [{ text: 'Roll IFT / TH / TK as appropriate. Apply results immediately.' }] },
          ],
        },
      ],
    },
    {
      id: 'movement',
      label: 'Movement Phase (Phasing)',
      sections: [
        {
          id: 'movement-start',
          label: 'Start',
          steps: [
            { id: 'move-s1', label: 'Place Opportunity Fire markers', clauses: [{ text: 'Non-phasing player declares which units will use Opportunity Fire (optional).' }] },
          ],
        },
        {
          id: 'movement-during',
          label: 'During',
          steps: [
            { id: 'move-d1', label: 'Move units', clauses: [{ text: 'Spend MF/MP to enter hexes. Announce each move before executing.' }] },
            { id: 'move-d2', label: 'Defensive First Fire', clauses: [{ text: 'Non-phasing player may fire at any point in a unit\'s movement.' }] },
            {
              id: 'move-d3', label: 'Advance into Melee', clauses: [
                { text: 'Phasing units may advance into a hex containing enemy units (melee declared).' },
              ]
            },
          ],
        },
      ],
    },
    {
      id: 'defensive-fire',
      label: 'Defensive Fire Phase (Non-Phasing)',
      sections: [
        {
          id: 'def-fire-during',
          label: 'During',
          steps: [
            { id: 'def-d1', label: 'Final Protective Fire', clauses: [{ text: 'Non-phasing player fires at units that moved adjacent (FPF at +1 DRM).' }] },
            { id: 'def-d2', label: 'Residual Fire', clauses: [{ text: 'Place residual fire counter for any ROF fire that did not retain ROF.' }] },
          ],
        },
      ],
    },
    {
      id: 'advancing-fire',
      label: 'Advancing Fire Phase (Phasing)',
      sections: [
        {
          id: 'adv-fire-during',
          label: 'During',
          steps: [
            { id: 'adv-d1', label: 'Advancing Fire', clauses: [{ text: 'Phasing units that moved may fire at half FP (round down). Cannot generate Prep Fire marker.' }] },
          ],
        },
      ],
    },
    {
      id: 'rout',
      label: 'Rout Phase',
      sections: [
        {
          id: 'rout-during',
          label: 'During',
          steps: [
            { id: 'rout-d1', label: 'Rout broken units', clauses: [{ text: 'Broken units must rout toward nearest friendly map edge if possible.' }] },
            { id: 'rout-d2', label: 'Elimination', clauses: [{ text: 'Broken units that cannot rout and are adjacent to Good Order enemy are eliminated.' }] },
          ],
        },
      ],
    },
    {
      id: 'advance',
      label: 'Advance Phase (Phasing)',
      sections: [
        {
          id: 'advance-during',
          label: 'During',
          steps: [
            { id: 'adv-p1', label: 'Advance', clauses: [{ text: 'Phasing Good Order units may advance one hex (no opportunity fire permitted).' }] },
          ],
        },
      ],
    },
    {
      id: 'close-combat',
      label: 'Close Combat Phase',
      sections: [
        {
          id: 'cc-during',
          label: 'During',
          steps: [
            { id: 'cc-d1', label: 'Resolve Melee', clauses: [{ text: 'Roll CCT for each hex containing both sides\' units. Ambush check first.' }] },
            { id: 'cc-d2', label: 'Capture / Withdraw', clauses: [{ text: 'Surviving non-phasing units may withdraw one hex if no melee remains.' }] },
          ],
        },
      ],
    },
  ],
}

export type FakeTableItem = { id: string; name: string; type: 'table'; content: MatrixContent | AttributeTableContent | ModifierListContent }
export type FakeSopItem = { id: string; name: string; type: 'sop'; content: SopContent }

export const fakeTables: FakeTableItem[] = [
  { id: 'fake-ift', name: 'Infantry Fire Table', type: 'table', content: fakeIft },
  { id: 'fake-tec', name: 'Terrain Effects Chart', type: 'table', content: fakeTec },
  { id: 'fake-morale', name: 'Morale Check DRM', type: 'table', content: fakeMoraleModifiers },
]

export const fakeSops: FakeSopItem[] = [
  { id: 'fake-sop', name: 'Sequence of Play', type: 'sop', content: fakeSop },
]
