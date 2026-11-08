import { describe, it, expect } from 'vitest'
import {
  FORMATION_BLUEPRINTS,
  ScenarioImportError,
  cloneScenario,
  createScenario,
  formationId,
  migrateScenario,
  formationsForSide,
  parseScenarioFile,
  serializeScenario,
  totalsFor,
} from '@/lib/formations'

const NOW = '2026-10-29T12:00:00.000Z'

describe('formation charts', () => {
  it('loads both Arracourt charts with all formations and units', () => {
    expect(formationsForSide('allies')).toHaveLength(10)
    expect(formationsForSide('germans')).toHaveLength(7)
    expect(FORMATION_BLUEPRINTS.reduce((sum, f) => sum + f.units.length, 0)).toBe(108)
  })

  it('builds unique stable formation ids across sides', () => {
    const ids = FORMATION_BLUEPRINTS.map((blueprint) => formationId(blueprint.side, blueprint.name))
    expect(new Set(ids).size).toBe(ids.length)
    expect(formationId('allies', 'Independent')).not.toBe(formationId('germans', 'Independent'))
  })
})

describe('createScenario', () => {
  it('starts selected formations in play and leaves everything else in reserve', () => {
    const scenario = createScenario('Arracourt', ['allies:2 Cav Grp', 'germans:11 Pz Div'], NOW)

    expect(scenario.name).toBe('Arracourt')
    expect(scenario.scenarioKey).toBe('arracourt')
    const inPlay = scenario.formations.filter((formation) => formation.status === 'in_game')
    expect(inPlay.map((formation) => formation.name).sort()).toEqual(['11 Pz Div', '2 Cav Grp'])
    expect(scenario.formations.filter((formation) => formation.status === 'reserve')).toHaveLength(
      15,
    )
    expect(scenario.formations.every((formation) => formation.fatigue === 'fresh')).toBe(true)
    expect(scenario.formations.every((formation) => formation.artilleryPoints === 0)).toBe(true)
  })

  it('computes current and starting steps per side', () => {
    const scenario = createScenario('Arracourt', ['allies:2 Cav Grp'], NOW)
    const allies = scenario.formations.filter(
      (formation) => formation.side === 'allies' && formation.status === 'in_game',
    )

    expect(totalsFor(allies)).toEqual({ steps: 8, startingSteps: 8 })
  })

  it('falls back to a default name', () => {
    expect(createScenario('   ', [], NOW).name).toBe('Untitled scenario')
  })
})

describe('scenario files', () => {
  it('round-trips through export and import', () => {
    const scenario = createScenario('My Game', ['allies:2 Cav Grp'], NOW)
    const formation = scenario.formations[0]
    if (!formation) throw new Error('missing formation')
    formation.units[0]!.steps = 0
    formation.units[1]!.steps = 0
    formation.fatigue = 3
    formation.support = ['2/37 Arm Bn', '2/320 Inf Bn']
    formation.artilleryPoints = 4
    formation.preparedDefense = true
    formation.completeMsr = true
    formation.done = true
    formation.status = 'dead_pool'

    const imported = parseScenarioFile(serializeScenario(scenario), NOW)

    expect(imported).toEqual(scenario)
  })

  it('imports a bare scenario object', () => {
    const scenario = createScenario('Bare', [], NOW)
    const imported = parseScenarioFile(JSON.stringify(scenario), NOW)
    expect(imported.name).toBe('Bare')
    expect(imported.formations).toHaveLength(scenario.formations.length)
  })

  it('rejects invalid JSON and unsupported versions', () => {
    expect(() => parseScenarioFile('not json')).toThrow(ScenarioImportError)
    expect(() =>
      parseScenarioFile(
        JSON.stringify({ format: 'olgur.formation-manager', version: 99, scenario: {} }),
      ),
    ).toThrow('unsupported format version')
  })

  it('rejects scenarios with no formations or units', () => {
    expect(() => parseScenarioFile(JSON.stringify({ formations: [] }))).toThrow('has no formations')
    expect(() =>
      parseScenarioFile(
        JSON.stringify({
          formations: [{ name: 'Empty', side: 'allies', units: [] }],
        }),
      ),
    ).toThrow('has no units')
  })

  it('deduplicates formation and unit ids from imported files', () => {
    const imported = parseScenarioFile(
      JSON.stringify({
        formations: [
          {
            id: 'dup',
            name: 'A',
            side: 'allies',
            units: [{ id: 'u', name: 'A1', startingSteps: 1, steps: 1 }],
          },
          {
            id: 'dup',
            name: 'B',
            side: 'allies',
            units: [
              { id: 'u', name: 'B1', startingSteps: 1, steps: 1 },
              { id: 'u', name: 'B2', startingSteps: 1, steps: 1 },
            ],
          },
        ],
      }),
      NOW,
    )

    const formationIds = imported.formations.map((formation) => formation.id)
    expect(new Set(formationIds).size).toBe(formationIds.length)
    const unitIds = imported.formations[1]!.units.map((unit) => unit.id)
    expect(new Set(unitIds).size).toBe(unitIds.length)
  })

  it('clamps imported unit steps and normalizes defaults', () => {
    const imported = parseScenarioFile(
      JSON.stringify({
        formations: [
          {
            name: 'Test',
            side: 'allies',
            units: [{ name: 'A', startingSteps: 4, steps: -2 }],
          },
        ],
      }),
      NOW,
    )

    const formation = imported.formations[0]!
    expect(formation.status).toBe('reserve')
    expect(formation.fatigue).toBe('fresh')
    expect(formation.units[0]?.steps).toBe(0)
    expect(formation.units[0]?.startingSteps).toBe(4)
  })

  it('upgrades a legacy single-string support value to a list', () => {
    const scenario = createScenario('Legacy', ['allies:2 Cav Grp'], NOW)
    const formation = scenario.formations[0]
    if (!formation) throw new Error('missing formation')
    ;(formation as unknown as { support: string }).support = '2/37 Arm Bn'

    const migrated = migrateScenario(scenario)
    expect(migrated.formations[0]?.support).toEqual(['2/37 Arm Bn'])
  })

  it('clones without sharing nested state', () => {
    const scenario = createScenario('Clone', ['allies:2 Cav Grp'], NOW)
    const copy = cloneScenario(scenario)
    copy.formations[0]!.units[0]!.steps = 0
    expect(scenario.formations[0]!.units[0]!.steps).not.toBe(0)
  })
})
