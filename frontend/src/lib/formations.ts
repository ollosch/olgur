import alliedChart from '@/data/bcs/arracourt_loss_chart_allies.json'
import germanChart from '@/data/bcs/arracourt_loss_chart_germans.json'
import type {
  FatigueLevel,
  Formation,
  FormationBlueprint,
  FormationSide,
  FormationStatus,
  FormationUnit,
  Scenario,
  ScenarioExport,
  StepTotals,
} from '@/types/formation'
import { ARTILLERY_MAX, FATIGUE_LEVELS } from '@/types/formation'

type RawChart = Record<string, Array<{ unit: string; steps: number }>>

const SCENARIO_KEY = 'arracourt'
export const SCENARIO_FORMAT = 'olgur.formation-manager'
export const SCENARIO_SCHEMA_VERSION = 1

function blueprintsFromChart(side: FormationSide, chart: RawChart): FormationBlueprint[] {
  return Object.entries(chart).map(([name, units]) => ({
    side,
    name,
    units: units.map((unit) => ({ name: unit.unit, steps: unit.steps })),
  }))
}

/** Canonical formation definitions shipped with the BCS tool. */
export const FORMATION_BLUEPRINTS: FormationBlueprint[] = [
  ...blueprintsFromChart('allies', alliedChart as RawChart),
  ...blueprintsFromChart('germans', germanChart as RawChart),
]

export function formationId(side: FormationSide, name: string): string {
  return `${side}:${name}`
}

function unitId(formation: string, index: number): string {
  return `${formation}:u${index}`
}

export function blueprintFor(id: string): FormationBlueprint | undefined {
  return FORMATION_BLUEPRINTS.find((blueprint) => formationId(blueprint.side, blueprint.name) === id)
}

export function formationsForSide(side: FormationSide): FormationBlueprint[] {
  return FORMATION_BLUEPRINTS.filter((blueprint) => blueprint.side === side)
}

function makeFormation(blueprint: FormationBlueprint, status: FormationStatus): Formation {
  const id = formationId(blueprint.side, blueprint.name)
  return {
    id,
    name: blueprint.name,
    side: blueprint.side,
    status,
    units: blueprint.units.map((unit, index) => ({
      id: unitId(id, index),
      name: unit.name,
      startingSteps: unit.steps,
      steps: unit.steps,
    })),
    preparedDefense: false,
    completeMsr: false,
    support: '',
    artilleryPoints: 0,
    fatigue: 'fresh',
  }
}

export function newScenarioId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Build a fresh scenario. Every formation is included; only the selected ones
 * start in play, the rest wait in reserve for later activation.
 */
export function createScenario(
  name: string,
  activeFormationIds: Iterable<string>,
  now: string = nowIso(),
): Scenario {
  const active = new Set(activeFormationIds)
  return {
    id: newScenarioId(),
    name: name.trim() || 'Untitled scenario',
    scenarioKey: SCENARIO_KEY,
    createdAt: now,
    updatedAt: now,
    formations: FORMATION_BLUEPRINTS.map((blueprint) =>
      makeFormation(
        blueprint,
        active.has(formationId(blueprint.side, blueprint.name)) ? 'in_game' : 'reserve',
      ),
    ),
  }
}

export function cloneScenario(scenario: Scenario): Scenario {
  return JSON.parse(JSON.stringify(scenario)) as Scenario
}

export function formationTotals(formation: Formation): StepTotals {
  return formation.units.reduce(
    (totals, unit) => ({
      steps: totals.steps + unit.steps,
      startingSteps: totals.startingSteps + unit.startingSteps,
    }),
    { steps: 0, startingSteps: 0 },
  )
}

export function totalsFor(formations: Formation[]): StepTotals {
  return formations.reduce(
    (totals, formation) => {
      const formationTotal = formationTotals(formation)
      return {
        steps: totals.steps + formationTotal.steps,
        startingSteps: totals.startingSteps + formationTotal.startingSteps,
      }
    },
    { steps: 0, startingSteps: 0 },
  )
}

export function formationsFor(formations: Formation[], side: FormationSide, status: FormationStatus): Formation[] {
  return formations.filter((formation) => formation.side === side && formation.status === status)
}

export function clampSteps(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

export function serializeScenario(scenario: Scenario): string {
  const payload: ScenarioExport = {
    format: SCENARIO_FORMAT,
    version: SCENARIO_SCHEMA_VERSION,
    exportedAt: nowIso(),
    scenario,
  }
  return JSON.stringify(payload, null, 2)
}

export class ScenarioImportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScenarioImportError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSide(value: unknown): value is FormationSide {
  return value === 'allies' || value === 'germans'
}

function isStatus(value: unknown): value is FormationStatus {
  return value === 'reserve' || value === 'in_game' || value === 'dead_pool'
}

function isFatigue(value: unknown): value is FatigueLevel {
  return (FATIGUE_LEVELS as unknown[]).includes(value)
}

function nonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(0, Math.floor(value))
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function normalizeUnit(
  raw: unknown,
  formationIdValue: string,
  index: number,
): FormationUnit {
  if (!isRecord(raw)) {
    throw new ScenarioImportError(`Unit ${index + 1} in ${formationIdValue} is invalid.`)
  }

  const name = stringOr(raw['name'], '').trim()
  if (name === '') {
    throw new ScenarioImportError(`Unit ${index + 1} in ${formationIdValue} has no name.`)
  }

  const steps = nonNegativeInt(raw['steps'], 0)
  const startingSteps = nonNegativeInt(raw['startingSteps'], steps)

  return {
    id: stringOr(raw['id'], unitId(formationIdValue, index)).trim() || unitId(formationIdValue, index),
    name,
    startingSteps,
    steps: clampSteps(steps),
  }
}

function normalizeFormation(raw: unknown, index: number): Formation {
  if (!isRecord(raw)) {
    throw new ScenarioImportError(`Formation ${index + 1} is invalid.`)
  }

  const side = raw['side']
  if (!isSide(side)) {
    throw new ScenarioImportError(`Formation ${index + 1} has an unknown side.`)
  }

  const name = stringOr(raw['name'], '').trim()
  if (name === '') {
    throw new ScenarioImportError(`Formation ${index + 1} has no name.`)
  }

  const id = stringOr(raw['id'], '').trim() || formationId(side, name)
  const unitsRaw = raw['units']
  if (!Array.isArray(unitsRaw) || unitsRaw.length === 0) {
    throw new ScenarioImportError(`${name} has no units.`)
  }

  return {
    id,
    name,
    side,
    status: isStatus(raw['status']) ? raw['status'] : 'reserve',
    units: unitsRaw.map((unit, unitIndex) => normalizeUnit(unit, id, unitIndex)),
    preparedDefense: raw['preparedDefense'] === true,
    completeMsr: raw['completeMsr'] === true,
    support: stringOr(raw['support'], ''),
    artilleryPoints: Math.min(nonNegativeInt(raw['artilleryPoints'], 0), ARTILLERY_MAX),
    fatigue: isFatigue(raw['fatigue']) ? raw['fatigue'] : 'fresh',
  }
}

function uniqueId(base: string, seen: Set<string>): string {
  let candidate = base
  let suffix = 2
  while (seen.has(candidate)) {
    candidate = `${base}#${suffix}`
    suffix++
  }
  return candidate
}

function normalizeScenario(raw: unknown, now: string): Scenario {
  if (!isRecord(raw)) {
    throw new ScenarioImportError('The file does not contain a scenario.')
  }

  const formationsRaw = raw['formations']
  if (!Array.isArray(formationsRaw) || formationsRaw.length === 0) {
    throw new ScenarioImportError('The scenario has no formations.')
  }

  const seenFormationIds = new Set<string>()
  const formations = formationsRaw.map((formation, index) => {
    const normalized = normalizeFormation(formation, index)
    const id = uniqueId(normalized.id, seenFormationIds)
    seenFormationIds.add(id)

    const seenUnitIds = new Set<string>()
    const units = normalized.units.map((unit, unitIndex) => {
      const unitIdValue = uniqueId(unit.id || `${id}:u${unitIndex}`, seenUnitIds)
      seenUnitIds.add(unitIdValue)
      return { ...unit, id: unitIdValue }
    })

    return { ...normalized, id, units }
  })

  return {
    id: stringOr(raw['id'], '').trim() || newScenarioId(),
    name: stringOr(raw['name'], '').trim() || 'Imported scenario',
    scenarioKey: stringOr(raw['scenarioKey'], SCENARIO_KEY) || SCENARIO_KEY,
    createdAt: stringOr(raw['createdAt'], now),
    updatedAt: stringOr(raw['updatedAt'], now),
    formations,
  }
}

/**
 * Parse an exported scenario file. Accepts both the wrapper produced by
 * `serializeScenario` and a bare scenario object for hand-written files.
 */
export function parseScenarioFile(contents: string, now: string = nowIso()): Scenario {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch {
    throw new ScenarioImportError('The selected file is not valid JSON.')
  }

  if (!isRecord(parsed)) {
    throw new ScenarioImportError('The selected file does not contain a scenario.')
  }

  if (parsed['format'] === SCENARIO_FORMAT) {
    if (parsed['version'] !== SCENARIO_SCHEMA_VERSION) {
      throw new ScenarioImportError(
        `This scenario uses an unsupported format version (${String(parsed['version'])}).`,
      )
    }
    return normalizeScenario(parsed['scenario'], now)
  }

  return normalizeScenario(parsed, now)
}
