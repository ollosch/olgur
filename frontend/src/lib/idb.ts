/**
 * Promise-wrapped native IndexedDB helpers for the offline cache layer.
 *
 * The single database `olgur-offline` holds four object stores, all keyed
 * out-of-line:
 *   - `systems`  — keyed by system id, value `{ system, modules }`
 *   - `manifests` — keyed by `${systemId}:${moduleId}`
 *   - `content`  — keyed by `${systemId}:${moduleId}:${kind}`, value carries
 *     the `version_id` it was cached from
 *   - `meta`     — keyed by system id, value is the registry entry
 */

const DB_NAME = 'olgur-offline'
const DB_VERSION = 1

export type IdbStore = 'systems' | 'manifests' | 'content' | 'meta'

const STORES: IdbStore[] = ['systems', 'manifests', 'content', 'meta']

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store)
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error ?? new Error('Failed to open IndexedDB'))
    }
    // A future version bump triggers `onupgradeneeded`; if another connection
    // holds an older version open, `onblocked` fires instead of hanging. Reset
    // `dbPromise` so a later call retries a fresh open.
    request.onblocked = () => {
      dbPromise = null
      reject(new Error('IndexedDB open was blocked by another connection'))
    }
  })

  return dbPromise
}

/**
 * Close the cached connection and forget it. Primarily used by tests so a
 * fresh `open` can follow a `deleteDatabase`.
 */
export async function closeIdb(): Promise<void> {
  const pending = dbPromise
  dbPromise = null
  if (pending) {
    try {
      const db = await pending
      db.close()
    } catch {
      // ignore close failures
    }
  }
}

function runRequest<T>(
  store: IdbStore,
  mode: IDBTransactionMode,
  action: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const request = action(tx.objectStore(store))

        tx.oncomplete = () => resolve(request.result)
        tx.onerror = () =>
          reject(tx.error ?? request.error ?? new Error(`IndexedDB ${mode} failed`))
        tx.onabort = () => reject(tx.error ?? new Error(`IndexedDB ${mode} aborted`))
      }),
  )
}

export function idbGet<T>(store: IdbStore, key: IDBValidKey): Promise<T | undefined> {
  return runRequest<T>(store, 'readonly', (objectStore) => objectStore.get(key))
}

export function idbGetAll<T>(store: IdbStore): Promise<T[]> {
  return runRequest<T[]>(store, 'readonly', (objectStore) => objectStore.getAll())
}

export function idbGetAllKeys(store: IdbStore): Promise<IDBValidKey[]> {
  return runRequest<IDBValidKey[]>(store, 'readonly', (objectStore) => objectStore.getAllKeys())
}

export async function idbPut<T>(store: IdbStore, key: IDBValidKey, value: T): Promise<void> {
  await runRequest<IDBValidKey>(store, 'readwrite', (objectStore) => objectStore.put(value, key))
}

export async function idbDelete(store: IdbStore, key: IDBValidKey): Promise<void> {
  await runRequest<undefined>(store, 'readwrite', (objectStore) => objectStore.delete(key))
}

export async function idbClear(store: IdbStore): Promise<void> {
  await runRequest<undefined>(store, 'readwrite', (objectStore) => objectStore.clear())
}
