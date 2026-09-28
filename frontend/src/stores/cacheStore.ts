import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { request } from '@/lib/http'
import { idbDelete, idbGet, idbGetAll, idbGetAllKeys, idbPut } from '@/lib/idb'
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
   * authenticated axios instance. Returns null on any error.
   */
  async function fetchCollection<T>(url: string): Promise<T[] | null> {
    try {
      const json = await request<T[]>({ method: 'GET', url })
      return Array.isArray(json) ? json : null
    } catch {
      return null
    }
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

  async function pinSystem(systemId: string): Promise<void> {
    if (pinInProgress.value.has(systemId)) return

    pinInProgress.value = new Set(pinInProgress.value).add(systemId)

    try {
      const [systemResult, modulesResult, manifestResult] = await Promise.all([
        get<ApiResource<System>>(`/systems/${systemId}`),
        get<ApiCollection<Module>>(`/systems/${systemId}/modules`),
        get<ApiResource<{ system_id: string; name?: string; modules?: ManifestEntry[] }>>(
          `/systems/${systemId}/manifest`,
        ),
      ])

      if (!systemResult.ok || !modulesResult.ok || !manifestResult.ok) return

      const system = systemResult.data.data
      const modules = modulesResult.data.data
      const manifestEntries = extractManifestEntries(manifestResult.data.data)

      const manifestByModule = new Map<string, ManifestEntry>()
      for (const entry of manifestEntries) {
        manifestByModule.set(entry.module_id, entry)
      }

      const viewable = modules.filter(
        (module) => module.permissions['content.view_released'] && manifestByModule.has(module.id),
      )

      let size = jsonSize(system) + jsonSize(modules)
      const writes: Promise<void>[] = [idbPut('systems', systemId, { system, modules })]

      for (const module of viewable) {
        const entry = manifestByModule.get(module.id)!
        size += jsonSize(entry)
        writes.push(idbPut('manifests', manifestKey(systemId, module.id), entry))

        const [rules, index, gameData] = await Promise.all([
          fetchCollection<Rule>(entry.content.rules),
          fetchCollection<IndexEntry>(entry.content.index),
          fetchCollection<GameDatum>(entry.content['game-data']),
        ])

        const byKind: Partial<Record<ContentKind, unknown[]>> = {
          rules: rules ?? undefined,
          index: index ?? undefined,
          'game-data': gameData ?? undefined,
        }

        for (const kind of CONTENT_KINDS) {
          const items = byKind[kind]
          if (!items) continue
          size += jsonSize(items)
          writes.push(
            idbPut('content', contentKey(systemId, module.id, kind), {
              version_id: entry.version_id,
              items,
            }),
          )
        }
      }

      await Promise.all(writes)

      const meta: CachedSystemMeta = {
        systemId,
        name: system.name,
        versionString: [...new Set(manifestEntries.map((entry) => entry.version_string))].join(
          ', ',
        ),
        cachedAt: Date.now(),
        size,
      }
      await idbPut('meta', systemId, meta)

      cachedSystems.value = [...cachedSystems.value.filter((e) => e.systemId !== systemId), meta]
      bytesUsed.value = cachedSystems.value.reduce((sum, e) => sum + e.size, 0)
    } finally {
      pinInProgress.value = new Set([...pinInProgress.value].filter((id) => id !== systemId))
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
    getCachedSystem,
    getCachedManifest,
    getCachedContent,
  }
})
