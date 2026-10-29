import { markRaw, type Component } from 'vue'
import type { GameDatum } from '@/types/domain'
import { FEATURES, resolveToolType } from '@/lib/features'
import UnitDataTab from '@/components/layout/UnitDataTab.vue'
import OrdnanceVersusArmorTool from '@/components/tools/OrdnanceVersusArmorTool.vue'
import FormationManagerTool from '@/components/tools/FormationManagerTool.vue'

/** A bottom-panel tool, keyed by the game-data type (or system slug) that triggers it. */
export interface GameDataTool {
  id: string
  label: string
  /** Compact label for the inline toolbar; falls back to `id`. */
  shortLabel?: string
  component: Component
}

export interface SystemTool {
  label: string
  shortLabel?: string
  component: Component
}

const TOOL_LABELS: Record<GameDatum['type'], string> = {
  sop: 'Sequence of Play',
  table: 'Tables',
  vehicle: 'Unit Data',
  ordnance: 'Ordnance vs Armor',
}

/**
 * Maps a `game_data` type to the self-contained tool component that renders it
 * in the bottom panel.
 *
 * `sop` and `table` are not listed here: they are rendered by the game-data
 * surfaces (`SopModal` / `TableBrowserModal` / `GameDataView`), which dispatch
 * on `game_data.type` and supply per-record props to the SOP viewer / table
 * renderer. Only the prop-less tools are registered below.
 */
export const GAME_DATA_TOOL_COMPONENTS: Partial<Record<GameDatum['type'], Component>> = {
  vehicle: markRaw(UnitDataTab),
  ordnance: markRaw(OrdnanceVersusArmorTool),
}

/**
 * Bespoke tools that have no backing `game_data` type, keyed by system slug.
 * The BCS Formation Manager is bundled with its own offline formation data.
 */
export const SYSTEM_TOOL_COMPONENTS: Record<string, SystemTool> = {
  bcs: {
    label: 'Formation Manager',
    shortLabel: 'Formations',
    component: markRaw(FormationManagerTool),
  },
}

/**
 * Derive the bottom-panel tools from the modules' game data.
 *
 * A bespoke system-level tool (matched by `systemSlug`) is listed first,
 * followed by one tool per distinct `game_data` type that has a deployed
 * component, in first-seen order.
 */
export function gameDataTools(gameData: GameDatum[], systemSlug?: string): GameDataTool[] {
  const tools: GameDataTool[] = []

  if (systemSlug) {
    const bespoke = SYSTEM_TOOL_COMPONENTS[systemSlug]
    if (bespoke) {
      tools.push({
        id: `system:${systemSlug}`,
        label: bespoke.label,
        shortLabel: bespoke.shortLabel ?? bespoke.label,
        component: bespoke.component,
      })
    }
  }

  const seen = new Set<GameDatum['type']>()
  for (const datum of gameData) {
    const type = resolveToolType(datum.type, FEATURES.afvVsAfv)
    const component = GAME_DATA_TOOL_COMPONENTS[type]
    if (component && !seen.has(type)) {
      seen.add(type)
      tools.push({ id: type, label: TOOL_LABELS[type], component })
    }
  }

  return tools
}
