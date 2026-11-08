import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { idbDelete, idbGet, idbGetAll, idbPut } from '@/lib/idb'
import {
  clampSteps,
  cloneScenario,
  createScenario,
  formationIsDestroyed,
  formationTotals,
  formationsFor,
  newScenarioId,
  nowIso,
  parseScenarioFile,
  serializeScenario,
  totalsFor,
} from '@/lib/formations'
import { ARTILLERY_MAX } from '@/types/formation'
import type {
  FatigueLevel,
  Formation,
  FormationSide,
  FormationStatus,
  Scenario,
  StepTotals,
} from '@/types/formation'

const LAST_SCENARIO_KEY = 'formation-manager:last-scenario'
const SAVE_DELAY_MS = 300

function sortScenarios(scenarios: Scenario[]): Scenario[] {
  return [...scenarios].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * Local-first scenario state for the BCS Formation Manager.
 *
 * Every mutation updates `current`, marks it dirty, and schedules a debounced
 * IndexedDB write. The tool works fully offline and scenarios can be exported
 * to / imported from JSON files for backup or moving between devices.
 */
export const useFormationManagerStore = defineStore('formationManager', () => {
  const ready = ref(false)
  const scenarios = ref<Scenario[]>([])
  const current = ref<Scenario | null>(null)
  const activeSide = ref<FormationSide>('allies')
  const selectedFormationId = ref<string | null>(null)
  const lastSavedAt = ref<string | null>(null)
  const saving = ref(false)
  const saveError = ref<string | null>(null)

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let pendingPersist: Promise<void> | null = null

  const currentFormations = computed((): Formation[] => current.value?.formations ?? [])

  const inPlay = computed((): Formation[] =>
    currentFormations.value.filter((formation) => formation.status === 'in_game'),
  )

  const reserve = computed((): Formation[] =>
    currentFormations.value.filter((formation) => formation.status === 'reserve'),
  )

  const deadPool = computed((): Formation[] =>
    currentFormations.value.filter((formation) => formation.status === 'dead_pool'),
  )

  const sides = computed(() => {
    const sideData = (
      side: FormationSide,
    ): {
      inPlay: Formation[]
      reserve: Formation[]
      deadPool: Formation[]
      totals: StepTotals
    } => {
      const inPlayForSide = formationsFor(currentFormations.value, side, 'in_game')
      return {
        inPlay: inPlayForSide,
        reserve: formationsFor(currentFormations.value, side, 'reserve'),
        deadPool: formationsFor(currentFormations.value, side, 'dead_pool'),
        totals: totalsFor(inPlayForSide),
      }
    }

    return {
      allies: sideData('allies'),
      germans: sideData('germans'),
    }
  })

  const activeSideData = computed(() => sides.value[activeSide.value])

  const selectedFormation = computed((): Formation | null => {
    if (selectedFormationId.value === null) return null
    return (
      currentFormations.value.find((formation) => formation.id === selectedFormationId.value) ??
      null
    )
  })

  function upsertInList(scenario: Scenario): void {
    const copy = cloneScenario(scenario)
    const index = scenarios.value.findIndex((entry) => entry.id === scenario.id)
    if (index === -1) {
      scenarios.value = sortScenarios([...scenarios.value, copy])
      return
    }
    const next = [...scenarios.value]
    next[index] = copy
    scenarios.value = sortScenarios(next)
  }

  function cancelScheduledSave(): void {
    if (saveTimer !== null) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
  }

  function scheduleSave(): void {
    cancelScheduledSave()
    saveTimer = setTimeout(() => {
      saveTimer = null
      void persistCurrent()
    }, SAVE_DELAY_MS)
  }

  async function persistCurrent(): Promise<void> {
    const scenario = current.value
    if (!scenario) return

    const snapshot = cloneScenario(scenario)
    const savedAt = snapshot.updatedAt
    saving.value = true

    const tracked: Promise<void> = idbPut('scenarios', snapshot.id, snapshot).finally(() => {
      if (pendingPersist === tracked) pendingPersist = null
    })
    pendingPersist = tracked

    try {
      await tracked
      lastSavedAt.value = savedAt
      saveError.value = null
    } catch (error) {
      saveError.value = error instanceof Error ? error.message : 'Could not save the scenario.'
    } finally {
      saving.value = false
    }
  }

  async function flushSave(): Promise<void> {
    cancelScheduledSave()
    if (pendingPersist) await pendingPersist
    await persistCurrent()
  }

  function touch(): void {
    const scenario = current.value
    if (!scenario) return
    scenario.updatedAt = nowIso()
    upsertInList(scenario)
    scheduleSave()
  }

  async function loadScenarios(): Promise<void> {
    if (ready.value) return
    try {
      const stored = await idbGetAll<Scenario>('scenarios')
      scenarios.value = sortScenarios(stored)
      const lastId = await idbGet<string>('scenarioMeta', LAST_SCENARIO_KEY)
      if (lastId) {
        const found = scenarios.value.find((scenario) => scenario.id === lastId)
        if (found) {
          current.value = cloneScenario(found)
          lastSavedAt.value = found.updatedAt
          saveError.value = null
        }
      }
    } catch {
      scenarios.value = []
    } finally {
      // Remove a pointer left in the shared cache `meta` store by an earlier
      // build that reused it for the last-opened scenario.
      try {
        await idbDelete('meta', LAST_SCENARIO_KEY)
      } catch {
        // Cleanup is best-effort.
      }
      ready.value = true
    }
  }

  async function openScenario(id: string): Promise<boolean> {
    if (current.value?.id === id) return true
    await flushSave()
    const found = scenarios.value.find((scenario) => scenario.id === id)
    if (!found) return false

    current.value = cloneScenario(found)
    selectedFormationId.value = null
    lastSavedAt.value = found.updatedAt
    saveError.value = null
    await idbPut('scenarioMeta', LAST_SCENARIO_KEY, id)
    return true
  }

  async function closeScenario(): Promise<void> {
    await flushSave()
    current.value = null
    selectedFormationId.value = null
    await idbDelete('scenarioMeta', LAST_SCENARIO_KEY)
  }

  async function createNewScenario(
    name: string,
    activeFormationIds: Iterable<string>,
  ): Promise<Scenario | null> {
    await flushSave()
    const scenario = createScenario(name, activeFormationIds)
    scenarios.value = sortScenarios([...scenarios.value, scenario])
    current.value = cloneScenario(scenario)
    selectedFormationId.value = null
    await idbPut('scenarios', scenario.id, scenario)
    await idbPut('scenarioMeta', LAST_SCENARIO_KEY, scenario.id)
    lastSavedAt.value = scenario.updatedAt
    saveError.value = null
    return current.value
  }

  async function deleteScenario(id: string): Promise<void> {
    if (current.value?.id === id) {
      cancelScheduledSave()
      // Clear the active scenario before awaiting the in-flight write: this
      // stops new edits from scheduling further writes that could resurrect
      // the row after it is deleted.
      current.value = null
      selectedFormationId.value = null
      if (pendingPersist) await pendingPersist
      await idbDelete('scenarioMeta', LAST_SCENARIO_KEY)
    }
    await idbDelete('scenarios', id)
    scenarios.value = scenarios.value.filter((scenario) => scenario.id !== id)
  }

  async function importScenario(contents: string): Promise<Scenario> {
    const parsed = parseScenarioFile(contents)
    if (scenarios.value.some((scenario) => scenario.id === parsed.id)) {
      parsed.id = newScenarioId()
    }
    parsed.updatedAt = nowIso()

    await flushSave()
    await idbPut('scenarios', parsed.id, cloneScenario(parsed))
    scenarios.value = sortScenarios([...scenarios.value, parsed])
    current.value = cloneScenario(parsed)
    selectedFormationId.value = null
    await idbPut('scenarioMeta', LAST_SCENARIO_KEY, parsed.id)
    lastSavedAt.value = parsed.updatedAt
    saveError.value = null
    return current.value
  }

  async function exportScenario(id: string): Promise<string> {
    if (current.value?.id === id) {
      await flushSave()
      return serializeScenario(current.value)
    }
    const found = scenarios.value.find((scenario) => scenario.id === id)
    if (!found) throw new Error('Scenario not found.')
    return serializeScenario(found)
  }

  function findFormation(id: string): Formation | undefined {
    return current.value?.formations.find((formation) => formation.id === id)
  }

  function setStatus(id: string, status: FormationStatus): void {
    const formation = findFormation(id)
    if (!formation || formation.status === status) return
    formation.status = status
    if (status !== 'in_game' && selectedFormationId.value === id) {
      selectedFormationId.value = null
    }
    touch()
  }

  function addToPlay(id: string): void {
    setStatus(id, 'in_game')
  }

  function returnToReserve(id: string): void {
    const formation = findFormation(id)
    if (!formation) return
    if (formationTotals(formation).steps <= 0) return
    setStatus(id, 'reserve')
  }

  function sendToDeadPool(id: string): void {
    setStatus(id, 'dead_pool')
  }

  function rebuild(id: string): void {
    const formation = findFormation(id)
    if (formation && formationIsDestroyed(formation)) {
      for (const unit of formation.units) {
        unit.steps = unit.startingSteps
      }
    }
    setStatus(id, 'in_game')
  }

  function setUnitSteps(formationId: string, unitId: string, value: number): void {
    const formation = findFormation(formationId)
    const unit = formation?.units.find((entry) => entry.id === unitId)
    if (!formation || !unit) return
    const next = clampSteps(value)
    if (next === unit.steps) return
    unit.steps = next
    if (formationIsDestroyed(formation)) {
      setStatus(formation.id, 'dead_pool')
      return
    }
    touch()
  }

  function adjustUnitSteps(formationId: string, unitId: string, delta: number): void {
    const formation = findFormation(formationId)
    const unit = formation?.units.find((entry) => entry.id === unitId)
    if (!unit) return
    setUnitSteps(formationId, unitId, unit.steps + delta)
  }

  function setPreparedDefense(id: string, value: boolean): void {
    const formation = findFormation(id)
    if (!formation || formation.preparedDefense === value) return
    formation.preparedDefense = value
    touch()
  }

  function setCompleteMsr(id: string, value: boolean): void {
    const formation = findFormation(id)
    if (!formation || formation.completeMsr === value) return
    formation.completeMsr = value
    touch()
  }

  function setSupport(id: string, value: string): void {
    const formation = findFormation(id)
    if (!formation || formation.support === value) return
    formation.support = value
    touch()
  }

  function setArtilleryPoints(id: string, value: number): void {
    const formation = findFormation(id)
    if (!formation) return
    const next = Math.min(clampSteps(value), ARTILLERY_MAX)
    if (next === formation.artilleryPoints) return
    formation.artilleryPoints = next
    touch()
  }

  function adjustArtilleryPoints(id: string, delta: number): void {
    const formation = findFormation(id)
    if (!formation) return
    setArtilleryPoints(id, formation.artilleryPoints + delta)
  }

  function setFatigue(id: string, fatigue: FatigueLevel): void {
    const formation = findFormation(id)
    if (!formation || formation.fatigue === fatigue) return
    formation.fatigue = fatigue
    touch()
  }

  function togglePreparedDefense(id: string): void {
    const formation = findFormation(id)
    if (!formation) return
    setPreparedDefense(id, !formation.preparedDefense)
  }

  function toggleCompleteMsr(id: string): void {
    const formation = findFormation(id)
    if (!formation) return
    setCompleteMsr(id, !formation.completeMsr)
  }

  function setActiveSide(side: FormationSide): void {
    activeSide.value = side
    const selected = selectedFormation.value
    if (selected && selected.side !== side) {
      selectedFormationId.value = null
    }
  }

  function selectFormation(id: string): void {
    const formation = findFormation(id)
    if (!formation || formation.status !== 'in_game') return
    selectedFormationId.value = id
  }

  function clearSelectedFormation(): void {
    selectedFormationId.value = null
  }

  function totalsForFormation(formation: Formation): StepTotals {
    return formationTotals(formation)
  }

  return {
    // state
    ready,
    scenarios,
    current,
    activeSide,
    selectedFormationId,
    lastSavedAt,
    saving,
    saveError,
    // computed
    currentFormations,
    inPlay,
    reserve,
    deadPool,
    sides,
    activeSideData,
    selectedFormation,
    // lifecycle
    loadScenarios,
    openScenario,
    closeScenario,
    createNewScenario,
    deleteScenario,
    importScenario,
    exportScenario,
    flushSave,
    // formation mutations
    setStatus,
    addToPlay,
    returnToReserve,
    sendToDeadPool,
    rebuild,
    setUnitSteps,
    adjustUnitSteps,
    setPreparedDefense,
    setCompleteMsr,
    setSupport,
    setArtilleryPoints,
    adjustArtilleryPoints,
    setFatigue,
    togglePreparedDefense,
    toggleCompleteMsr,
    // ui
    setActiveSide,
    selectFormation,
    clearSelectedFormation,
    totalsForFormation,
  }
})
