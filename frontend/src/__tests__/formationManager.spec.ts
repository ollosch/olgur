import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { closeIdb, idbGetAll } from '@/lib/idb'
import { useFormationManagerStore } from '@/stores/formationManager'

function resetDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('olgur-offline')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

async function freshStore() {
  setActivePinia(createPinia())
  const store = useFormationManagerStore()
  await store.loadScenarios()
  return store
}

beforeEach(async () => {
  await closeIdb()
  await resetDatabase()
})

afterEach(async () => {
  await closeIdb()
})

describe('formation manager store', () => {
  it('creates a scenario and restores it from IndexedDB', async () => {
    const store = await freshStore()

    const created = await store.createNewScenario('Arracourt', ['allies:2 Cav Grp'])
    expect(created).not.toBeNull()
    expect(store.scenarios).toHaveLength(1)
    expect(store.current?.name).toBe('Arracourt')

    const formation = store.current?.formations.find((entry) => entry.name === '2 Cav Grp')
    expect(formation?.status).toBe('in_game')
    const unit = formation?.units[0]
    if (!formation || !unit) throw new Error('missing unit')

    store.adjustUnitSteps(formation.id, unit.id, -2)
    store.setFatigue(formation.id, 2)
    store.setSupport(formation.id, '2/37 Arm Bn')
    store.setArtilleryPoints(formation.id, 3)
    store.togglePreparedDefense(formation.id)
    store.toggleCompleteMsr(formation.id)
    await store.flushSave()

    const reloaded = await freshStore()
    expect(reloaded.current?.name).toBe('Arracourt')
    const restored = reloaded.current?.formations.find((entry) => entry.name === '2 Cav Grp')
    expect(restored?.units[0]?.steps).toBe(2)
    expect(restored?.fatigue).toBe(2)
    expect(restored?.support).toBe('2/37 Arm Bn')
    expect(restored?.artilleryPoints).toBe(3)
    expect(restored?.preparedDefense).toBe(true)
    expect(restored?.completeMsr).toBe(true)
  })

  it('clamps steps at zero and allows over-strength units', async () => {
    const store = await freshStore()
    await store.createNewScenario('Steps', ['allies:2 Cav Grp'])
    const formation = store.current?.formations.find((entry) => entry.name === '2 Cav Grp')
    const unit = formation?.units[0]
    if (!formation || !unit) throw new Error('missing unit')

    store.adjustUnitSteps(formation.id, unit.id, -99)
    expect(formation.units[0]?.steps).toBe(0)

    store.adjustUnitSteps(formation.id, unit.id, 7)
    expect(formation.units[0]?.steps).toBe(7)
    expect(formation.units[0]?.startingSteps).toBe(4)
  })

  it('caps artillery points at five', async () => {
    const store = await freshStore()
    await store.createNewScenario('Artillery', ['allies:2 Cav Grp'])
    const formation = store.current?.formations.find((entry) => entry.name === '2 Cav Grp')
    if (!formation) throw new Error('missing formation')

    store.setArtilleryPoints(formation.id, 99)
    expect(formation.artilleryPoints).toBe(5)
    store.adjustArtilleryPoints(formation.id, 1)
    expect(formation.artilleryPoints).toBe(5)
  })

  it('keeps last-opened metadata out of the offline cache registry', async () => {
    const store = await freshStore()
    await store.createNewScenario('Metadata', ['allies:2 Cav Grp'])
    await store.flushSave()

    expect(await idbGetAll('meta')).toEqual([])
    expect(await idbGetAll('scenarioMeta')).toHaveLength(1)
  })

  it('moves formations through reserve, play, and the Dead Pool', async () => {
    const store = await freshStore()
    await store.createNewScenario('Transitions', [])
    const formation = store.current?.formations.find((entry) => entry.name === 'CCA/4 Arm Bde')
    const unit = formation?.units[0]
    if (!formation || !unit) throw new Error('missing formation')

    expect(formation.status).toBe('reserve')

    store.addToPlay(formation.id)
    expect(formation.status).toBe('in_game')

    store.adjustUnitSteps(formation.id, unit.id, -1)
    const stepsBefore = formation.units[0]?.steps
    store.sendToDeadPool(formation.id)
    expect(formation.status).toBe('dead_pool')

    store.rebuild(formation.id)
    expect(formation.status).toBe('in_game')
    expect(formation.units[0]?.steps).toBe(stepsBefore)

    store.returnToReserve(formation.id)
    expect(formation.status).toBe('reserve')
  })

  it('keeps a spent formation in the dead pool', async () => {
    const store = await freshStore()
    await store.createNewScenario('Spent', ['allies:2 Cav Grp'])
    const formation = store.current?.formations.find((entry) => entry.name === '2 Cav Grp')
    if (!formation) throw new Error('missing formation')

    for (const unit of formation.units) {
      store.setUnitSteps(formation.id, unit.id, 0)
    }
    expect(formation.status).toBe('dead_pool')

    store.returnToReserve(formation.id)
    expect(formation.status).toBe('dead_pool')
  })

  it('moves a formation to the dead pool when every unit loses its steps', async () => {
    const store = await freshStore()
    await store.createNewScenario('Unit losses', ['allies:2 Cav Grp'])
    const formation = store.current?.formations.find((entry) => entry.name === '2 Cav Grp')
    if (!formation) throw new Error('missing formation')
    const firstUnit = formation.units[0]
    if (!firstUnit) throw new Error('missing unit')

    store.selectFormation(formation.id)
    store.setUnitSteps(formation.id, firstUnit.id, 0)
    expect(firstUnit.steps).toBe(0)
    expect(formation.status).toBe('in_game')

    for (const unit of formation.units.slice(1)) {
      store.setUnitSteps(formation.id, unit.id, 0)
    }
    expect(formation.status).toBe('dead_pool')
    expect(store.selectedFormationId).toBeNull()

    store.rebuild(formation.id)
    expect(formation.status).toBe('in_game')
    expect(formation.units.every((unit) => unit.steps === unit.startingSteps)).toBe(true)
  })

  it('exports, imports (with a new id on collision), and deletes scenarios', async () => {
    const store = await freshStore()
    await store.createNewScenario('Original', ['allies:2 Cav Grp'])
    const originalId = store.current?.id
    if (!originalId) throw new Error('missing scenario')

    const exported = await store.exportScenario(originalId)
    const imported = await store.importScenario(exported)

    expect(imported.id).not.toBe(originalId)
    expect(store.scenarios).toHaveLength(2)
    expect(store.current?.name).toBe('Original')

    await store.deleteScenario(originalId)
    expect(store.scenarios).toHaveLength(1)
    expect(store.current?.id).toBe(imported.id)
  })

  it('sorts the library by most recently updated', async () => {
    const store = await freshStore()
    const first = await store.createNewScenario('First', [])
    if (!first) throw new Error('missing scenario')
    const firstId = first.id
    await store.closeScenario()

    const second = await store.createNewScenario('Second', [])
    if (!second) throw new Error('missing scenario')
    await store.flushSave()

    expect(store.scenarios[0]?.id).toBe(second.id)

    await store.openScenario(firstId)
    const formation = store.current?.formations[0]
    if (!formation) throw new Error('missing formation')
    store.setSupport(formation.id, 'changed')
    await store.flushSave()

    expect(store.scenarios[0]?.id).toBe(firstId)
  })

  it('selects only formations that are in play and can clear the selection', async () => {
    const store = await freshStore()
    await store.createNewScenario('Selection', ['allies:2 Cav Grp'])
    const inPlay = store.current?.formations.find((entry) => entry.id === 'allies:2 Cav Grp')
    const reserve = store.current?.formations.find((entry) => entry.status === 'reserve')
    if (!inPlay || !reserve) throw new Error('missing formation')

    store.selectFormation(inPlay.id)
    expect(store.selectedFormationId).toBe(inPlay.id)
    expect(store.selectedFormation?.id).toBe(inPlay.id)

    store.selectFormation(reserve.id)
    expect(store.selectedFormationId).toBe(inPlay.id)

    store.clearSelectedFormation()
    expect(store.selectedFormationId).toBeNull()
    expect(store.selectedFormation).toBeNull()
  })

  it('clears the selection when switching to a side without the selected formation', async () => {
    const store = await freshStore()
    await store.createNewScenario('Sides', ['allies:2 Cav Grp'])
    const formation = store.current?.formations.find((entry) => entry.id === 'allies:2 Cav Grp')
    if (!formation) throw new Error('missing formation')

    store.selectFormation(formation.id)
    store.setActiveSide('allies')
    expect(store.selectedFormationId).toBe(formation.id)

    store.setActiveSide('germans')
    expect(store.selectedFormationId).toBeNull()
  })

  it('clears the selection when the selected formation leaves play', async () => {
    const store = await freshStore()
    await store.createNewScenario('Leaving play', ['allies:2 Cav Grp'])
    const formation = store.current?.formations.find((entry) => entry.id === 'allies:2 Cav Grp')
    if (!formation) throw new Error('missing formation')

    store.selectFormation(formation.id)
    store.sendToDeadPool(formation.id)
    expect(store.selectedFormationId).toBeNull()

    store.rebuild(formation.id)
    store.selectFormation(formation.id)
    store.returnToReserve(formation.id)
    expect(store.selectedFormationId).toBeNull()
  })

  it('clears the selection when the scenario is closed', async () => {
    const store = await freshStore()
    await store.createNewScenario('Closing', ['allies:2 Cav Grp'])
    const formation = store.current?.formations.find((entry) => entry.id === 'allies:2 Cav Grp')
    if (!formation) throw new Error('missing formation')

    store.selectFormation(formation.id)
    await store.closeScenario()

    expect(store.selectedFormationId).toBeNull()
  })
})
