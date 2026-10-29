import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { request } from '@/lib/http'
import { idbDelete, idbGet, idbGetAll, idbGetAllKeys, idbPut } from '@/lib/idb'
import type { IdbStore } from '@/lib/idb'
import type {
  System,
  Module,
  ManifestEntry,
  Rule,
  IndexEntry,
  GameDatum,
  ApiResource,
  ApiCollection,
} from '@/types/domain'

export type ContentKind = 'rules' | 'index' | 'game-data'

/**
 * Result of a pin attempt. Callers that only care about background refreshes
 * can ignore this; UI callers use it to avoid reporting a false success.
 */
export type PinOutcome = 'pinned' | 'skipped' | 'no-content' | 'request-failed'

export interface CachedSystem {
  system: System
  modules: Module[]
}

export interface CachedContent<T> {
  version_id: string
  items: T[]
}

export interface CachedSystemMeta {
  systemId: string
  name: string
  versionString: string
  cachedAt: number
  size: number
}

const CONTENT_KINDS: ContentKind[] = ['rules', 'index', 'game-data']

function manifestKey(systemId: string, moduleId: string): string {
  return `${systemId}:${moduleId}`
}

function contentKey(systemId: string, moduleId: string, kind: ContentKind): string {
  return `${systemId}:${moduleId}:${kind}`
}

function jsonSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length
}

function extractManifestEntries(
  payload:
    | { system_id?: string; name?: string; modules?: ManifestEntry[] }
    | ManifestEntry[]
    | null
    | undefined,
): ManifestEntry[] {
  if (Array.isArray(payload)) return payload
  return payload?.modules ?? []
}

/**
 * Normalize a comma-joined set of version strings into a canonical signature so
 * two sets can be compared regardless of member order or empty entries.
 */
export function versionSignature(joined: string): string {
  return joined
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .sort()
    .join(', ')
}

interface WriteRecord {
  store: IdbStore
  key: string
  value: unknown
}

export const useCacheStore = defineStore('cache', () => {
  const { get } = useApi()

  const cachedSystems = ref<CachedSystemMeta[]>([])
  const pinInProgress = ref<Set<string>>(new Set())
  const bytesUsed = ref(0)
  const quota = ref(0)

  function isCached(systemId: string): boolean {
    return cachedSystems.value.some((entry) => entry.systemId === systemId)
  }

  /**
   * Fetch a released JSON collection from an absolute URL using the
   * authenticated axios instance. Throws a descriptive Error on any failure so
   * a missing content kind aborts the pin rather than being silently skipped.
   */
  async function fetchCollection<T>(url: string): Promise<T[]> {
    let json: T[]
    try {
      json = await request<T[]>({ method: 'GET', url })
    } catch {
      throw new Error(`Failed to download content from ${url}`)
    }
    if (!Array.isArray(json)) {
      throw new Error(`Content from ${url} was not a collection`)
    }
    return json
  }

  async function loadRegistry(): Promise<void> {
    const entries = await idbGetAll<CachedSystemMeta>('meta')
    cachedSystems.value = entries
    bytesUsed.value = entries.reduce((sum, entry) => sum + entry.size, 0)
  }

  async function estimateStorage(): Promise<{ usage: number; quota: number }> {
    try {
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate()
        quota.value = estimate.quota ?? 0
        bytesUsed.value = estimate.usage ?? 0
        return { usage: bytesUsed.value, quota: quota.value }
      }
    } catch {
      // fall through to size-based accounting
    }

    await loadRegistry()
    return { usage: bytesUsed.value, quota: quota.value }
  }

  async function pinSystem(systemId: string): Promise<PinOutcome> {
    if (pinInProgress.value.has(systemId)) return 'skipped'

    pinInProgress.value = new Set(pinInProgress.value).add(systemId)

    try {
      const [systemResult, modulesResult, manifestResult] = await Promise.all([
        get<ApiResource<System>>(`/systems/${systemId}`),
        get<ApiCollection<Module>>(`/systems/${systemId}/modules`),
        get<ApiResource<{ system_id: string; name?: string; modules?: ManifestEntry[] }>>(
          `/systems/${systemId}/manifest`,
        ),
      ])

      if (!systemResult.ok || !modulesResult.ok || !manifestResult.ok) return 'request-failed'

      const system = systemResult.data.data
      const modules = modulesResult.data.data
      const manifestEntries = extractManifestEntries(manifestResult.data.data)

      const manifestByModule = new Map<string, ManifestEntry>()
      for (const entry of manifestEntries) {
        manifestByModule.set(entry.module_id, entry)
      }

      const viewable = modules.filter((module) => {
        const entry = manifestByModule.get(module.id)
        return (
          (module.permissions?.['content.view_released'] ?? false) &&
          entry?.content != null &&
          entry.version_id != null
        )
      })

      if (viewable.length === 0) return 'no-content'

      let size = jsonSize(system) + jsonSize(modules)
      const records: WriteRecord[] = [
        { store: 'systems', key: systemId, value: { system, modules } },
      ]

      for (const module of viewable) {
        const entry = manifestByModule.get(module.id)
        const content = entry?.content
        const versionId = entry?.version_id
        if (!entry || !content || versionId == null) continue
        size += jsonSize(entry)
        records.push({ store: 'manifests', key: manifestKey(systemId, module.id), value: entry })

        const [rules, index, gameData] = await Promise.all([
          fetchCollection<Rule>(content.rules),
          fetchCollection<IndexEntry>(content.index),
          fetchCollection<GameDatum>(content['game-data']),
        ])

        const byKind: Record<ContentKind, unknown[]> = {
          rules,
          index,
          'game-data': gameData,
        }

        for (const kind of CONTENT_KINDS) {
          const items = byKind[kind]
          size += jsonSize(items)
          records.push({
            store: 'content',
            key: contentKey(systemId, module.id, kind),
            value: { version_id: versionId, items },
          })
        }
      }

      const meta: CachedSystemMeta = {
        systemId,
        name: system.name,
        versionString: [
          ...new Set(
            manifestEntries
              .map((entry) => entry.version_string)
              .filter((value): value is string => value != null),
          ),
        ].join(', '),
        cachedAt: Date.now(),
        size,
      }
      records.push({ store: 'meta', key: systemId, value: meta })

      await assertStorageHeadroom(size)
      await writeRecords(records)

      cachedSystems.value = [...cachedSystems.value.filter((e) => e.systemId !== systemId), meta]
      bytesUsed.value = cachedSystems.value.reduce((sum, e) => sum + e.size, 0)
      return 'pinned'
    } finally {
      pinInProgress.value = new Set([...pinInProgress.value].filter((id) => id !== systemId))
    }
  }

  /**
   * Re-pin a cached system when its stored version no longer matches the given
   * current version set. No-ops when the system is not cached or is up to date.
   */
  async function refreshIfStale(systemId: string, currentVersionString: string): Promise<void> {
    const meta = cachedSystems.value.find((entry) => entry.systemId === systemId)
    if (meta === undefined) return
    if (versionSignature(meta.versionString) === versionSignature(currentVersionString)) return
    await pinSystem(systemId)
  }

  async function assertStorageHeadroom(pendingSize: number): Promise<void> {
    const { usage, quota } = await estimateStorage()
    if (quota > 0 && usage + pendingSize > quota) {
      throw new Error('Not enough storage space to cache this system offline.')
    }
  }

  async function writeRecords(records: WriteRecord[]): Promise<void> {
    const written: WriteRecord[] = []
    try {
      for (const record of records) {
        await idbPut(record.store, record.key, record.value)
        written.push(record)
      }
    } catch {
      await Promise.all(
        written.map((record) => idbDelete(record.store, record.key).catch(() => undefined)),
      )
      throw new Error('Failed to save the offline cache. Please try again.')
    }
  }

  async function unpinSystem(systemId: string): Promise<void> {
    const prefix = `${systemId}:`
    const [manifestKeys, contentKeys] = await Promise.all([
      idbGetAllKeys('manifests'),
      idbGetAllKeys('content'),
    ])

    const manifests = manifestKeys.filter(
      (key) => typeof key === 'string' && key.startsWith(prefix),
    )
    const contents = contentKeys.filter((key) => typeof key === 'string' && key.startsWith(prefix))

    await Promise.all([
      idbDelete('systems', systemId),
      idbDelete('meta', systemId),
      ...manifests.map((key) => idbDelete('manifests', key)),
      ...contents.map((key) => idbDelete('content', key)),
    ])

    cachedSystems.value = cachedSystems.value.filter((e) => e.systemId !== systemId)
    bytesUsed.value = cachedSystems.value.reduce((sum, e) => sum + e.size, 0)
  }

  function getCachedSystem(systemId: string): Promise<CachedSystem | undefined> {
    return idbGet<CachedSystem>('systems', systemId)
  }

  function getCachedManifest(
    systemId: string,
    moduleId: string,
  ): Promise<ManifestEntry | undefined> {
    return idbGet<ManifestEntry>('manifests', manifestKey(systemId, moduleId))
  }

  function getCachedContent<T>(
    systemId: string,
    moduleId: string,
    kind: ContentKind,
  ): Promise<CachedContent<T> | undefined> {
    return idbGet<CachedContent<T>>('content', contentKey(systemId, moduleId, kind))
  }

  return {
    cachedSystems,
    pinInProgress,
    bytesUsed,
    quota,
    isCached,
    loadRegistry,
    estimateStorage,
    pinSystem,
    unpinSystem,
    refreshIfStale,
    getCachedSystem,
    getCachedManifest,
    getCachedContent,
  }
})
