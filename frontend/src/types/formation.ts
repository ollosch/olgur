/** Types for the BCS Formation Manager tool. */

export type FormationSide = 'allies' | 'germans'

/**
 * A formation's lifecycle inside one scenario:
 * - `reserve`: not yet committed to the game
 * - `in_game`: on the map / participating
 * - `dead_pool`: destroyed, can be rebuilt into `in_game`
 */
export type FormationStatus = 'reserve' | 'in_game' | 'dead_pool'

/** BCS fatigue: Fresh, then levels 0 through 4. */
export type FatigueLevel = 'fresh' | 0 | 1 | 2 | 3 | 4

export interface FormationUnit {
  id: string
  name: string
  startingSteps: number
  steps: number
}

export interface Formation {
  id: string
  name: string
  side: FormationSide
  status: FormationStatus
  units: FormationUnit[]
  preparedDefense: boolean
  completeMsr: boolean
  support: string[]
  artilleryPoints: number
  fatigue: FatigueLevel
}

export interface Scenario {
  id: string
  name: string
  scenarioKey: string
  createdAt: string
  updatedAt: string
  formations: Formation[]
}

export interface ScenarioExport {
  format: 'olgur.formation-manager'
  version: 1
  exportedAt: string
  scenario: Scenario
}

export interface FormationBlueprint {
  side: FormationSide
  name: string
  units: Array<{ name: string; steps: number }>
}

export interface StepTotals {
  steps: number
  startingSteps: number
}

export const FATIGUE_LEVELS: FatigueLevel[] = ['fresh', 0, 1, 2, 3, 4]

export const ARTILLERY_MAX = 5

export const SIDE_LABELS: Record<FormationSide, string> = {
  allies: 'Allies',
  germans: 'Germans',
}

export const STATUS_LABELS: Record<FormationStatus, string> = {
  reserve: 'Reserve',
  in_game: 'In play',
  dead_pool: 'Dead Pool',
}

export function fatigueLabel(fatigue: FatigueLevel): string {
  return fatigue === 'fresh' ? 'Fresh' : `Fatigue ${fatigue}`
}
