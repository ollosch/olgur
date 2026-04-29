import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useSystemStore } from '@/stores/system'
import type { Rule, IndexEntry, ApiCollection } from '@/types/domain'

export const useContentStore = defineStore('content', () => {
  const { get, loading } = useApi()
  const systemStore = useSystemStore()

  const rulesByModule = ref<Record<string, Rule[]>>({})
  const indexEntriesByModule = ref<Record<string, IndexEntry[]>>({})

  async function fetchRules(moduleId: string) {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return

    const result = await get<ApiCollection<Rule>>(`/systems/${systemId}/modules/${moduleId}/rules`)
    if (result) {
      rulesByModule.value[moduleId] = result.data
    }
  }

  async function fetchIndexEntries(moduleId: string) {
    const systemId = systemStore.currentSystem?.id
    if (!systemId) return

    const result = await get<ApiCollection<IndexEntry>>(
      `/systems/${systemId}/modules/${moduleId}/index-entries`,
    )
    if (result) {
      indexEntriesByModule.value[moduleId] = result.data
    }
  }

  function clear() {
    rulesByModule.value = {}
    indexEntriesByModule.value = {}
  }

  return { rulesByModule, indexEntriesByModule, loading, fetchRules, fetchIndexEntries, clear }
})
