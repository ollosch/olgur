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
  topics: {
    groups: [
      {
        slug: 'night',
        label: 'Night',
        ref: 'E1',
        topics: [],
      },
      {
        slug: 'pacific-theatre',
        label: 'Pacific Theatre',
        ref: 'G',
        topics: [
          { slug: 'japanese', label: 'The Japanese', ref: 'G1' },
          { slug: 'us-marine', label: 'US Marines', ref: 'G14' },
        ],
      },
    ],
  },
  pre_game: {
    segments: [
      { mpath: '0.1', player: 'B', runs: [{ text: 'Set up scenario forces per scenario special rules.', tags: [] }] },
    ],
  },
  phases: [
    {
      slug: 'rally-phase',
      label: 'Rally Phase',
      steps: [
        {
          slug: 'start-of-rph',
          label: 'Start of RPh',
          segments: [
            { mpath: '1.1', player: 'B', runs: [{ text: 'Remove all Prep Fire (PF) markers from units of both sides.', tags: [] }] },
          ],
        },
        {
          slug: 'during-rph',
          label: 'During RPh',
          segments: [
            { mpath: '1.2', player: 'A', runs: [{ text: 'Attempt to repair Malfunctioned SW or recover SW from adjacent hex.', tags: [] }] },
            {
              mpath: '1.3', player: 'A', runs: [
                { text: 'Roll for each broken unit: ≤ current morale → rallied.', tags: [] },
                { text: ' Japanese fanatic units add +2 DRM.', tags: ['japanese'] },
              ]
            },
            {
              mpath: '1.4', player: 'A', runs: [
                { text: 'Night rally: ELR check applies.', tags: ['night'] },
              ]
            },
          ],
        },
        {
          slug: 'end-of-rph',
          label: 'End of RPh',
          segments: [
            { mpath: '1.9', player: 'B', runs: [{ text: 'Remove DM markers from all rallied units.', tags: [] }] },
          ],
        },
      ],
    },
    {
      slug: 'prep-fire-phase',
      label: 'Prep Fire Phase',
      steps: [
        {
          slug: 'during-pfph',
          label: 'During PFPh',
          segments: [
            { mpath: '2.1', player: 'A', runs: [{ text: 'Phasing player fires any non-moving units; place PF marker.', tags: [] }] },
            { mpath: '2.2', player: 'A', runs: [{ text: 'Resolve fire on IFT / TH / TK as appropriate. Apply results immediately.', tags: [] }] },
          ],
        },
      ],
    },
    {
      slug: 'movement-phase',
      label: 'Movement Phase',
      sniper: true,
      steps: [
        {
          slug: 'during-mph',
          label: 'During MPh',
          segments: [
            { mpath: '3.1', player: 'A', runs: [{ text: 'Spend MF/MP to enter hexes. Announce each move before executing.', tags: [] }] },
            { mpath: '3.2', player: 'D', runs: [{ text: 'Non-phasing player may fire Defensive First Fire at any point in a unit\'s movement.', tags: [] }] },
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
