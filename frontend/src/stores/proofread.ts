import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useOnline } from '@/composables/useOnline'
import { useSystemStore } from '@/stores/system'
import { useContentStore } from '@/stores/content'
import type {
  ApiResource,
  ProofreadEntityType,
  ProofreadEntityStatus,
  ProofreadStatus,
} from '@/types/domain'

export interface NeedsProofreadingEntry {
  type: ProofreadEntityType
  id: string
  moduleId: string
  label: string
  sublabel: string | null
  sortKey: string
  count: number
}

export const useProofreadStore = defineStore('proofread', () => {
  const systemStore = useSystemStore()
  const contentStore = useContentStore()
  const { get, post, del } = useApi()
  const { offline } = useOnline()

  const statusMap = ref<Record<string, ProofreadEntityStatus>>({})
  const threshold = ref(3)

  /** Whether the current user can proofread at least one module of this system. */
  const canProofread = computed(
    (): boolean =>
      !offline.value && systemStore.modules.some((m) => m.permissions['content.proofread']),
  )

  function applyStatus(status: ProofreadStatus): void {
    threshold.value = status.threshold
    statusMap.value = status.proofreads
  }

  async function fetchStatus(systemId: string): Promise<void> {
    const result = await get<ApiResource<ProofreadStatus>>(`/systems/${systemId}/proofreads`)
    if (result.ok) {
      applyStatus(result.data.data)
    }
  }

  async function record(entityType: ProofreadEntityType, entityId: string): Promise<void> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return
    const result = await post<
      ApiResource<ProofreadStatus>,
      { entity_type: ProofreadEntityType; entity_id: string }
    >(`/systems/${systemId}/proofreads`, {
      entity_type: entityType,
      entity_id: entityId,
    })
    if (result.ok) {
      applyStatus(result.data.data)
    }
  }

  async function remove(entityType: ProofreadEntityType, entityId: string): Promise<void> {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return
    const result = await del<void>(`/systems/${systemId}/proofreads/${entityType}/${entityId}`)
    if (result.ok) {
      await fetchStatus(systemId)
    }
  }

  function countFor(entityId: string): number {
    return statusMap.value[entityId]?.count ?? 0
  }

  function isDone(entityId: string): boolean {
    return countFor(entityId) >= threshold.value
  }

  function hasMarked(entityId: string): boolean {
    return statusMap.value[entityId]?.me ?? false
  }

  const needsProofreading = computed((): NeedsProofreadingEntry[] => {
    const entries: NeedsProofreadingEntry[] = []
    const t = threshold.value

    for (const rule of contentStore.allRules) {
      const count = countFor(rule.id)
      if (count >= t) continue
      entries.push({
        type: 'rule',
        id: rule.id,
        moduleId: rule.module_id,
        label: rule.title,
        sublabel: rule.number,
        sortKey: rule.number,
        count,
      })
    }

    for (const entry of contentStore.allIndexEntries) {
      const count = countFor(entry.id)
      if (count >= t) continue
      entries.push({
        type: 'index_entry',
        id: entry.id,
        moduleId: entry.module_id,
        label: entry.term,
        sublabel: null,
        sortKey: entry.term.toLowerCase(),
        count,
      })
    }

    for (const datum of contentStore.allGameData) {
      const count = countFor(datum.id)
      if (count >= t) continue
      entries.push({
        type: 'game_datum',
        id: datum.id,
        moduleId: datum.module_id,
        label: datum.name,
        sublabel: null,
        sortKey: datum.name.toLowerCase(),
        count,
      })
    }

    return entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  })

  function clear(): void {
    statusMap.value = {}
    threshold.value = 3
  }

  return {
    statusMap,
    threshold,
    canProofread,
    fetchStatus,
    record,
    remove,
    countFor,
    isDone,
    hasMarked,
    needsProofreading,
    clear,
  }
})
