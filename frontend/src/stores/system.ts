import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useMembershipStore } from '@/stores/membership'
import type { ApiResult } from '@/lib/http'
import type {
  System,
  Module,
  CreateSystemRequest,
  CreateModuleRequest,
  ApiResource,
  ApiCollection,
} from '@/types/domain'

export const useSystemStore = defineStore('system', () => {
  const { get, post, put, del, loading } = useApi()

  // ── Systems list (home/browse view) ─────────────────────────────────────────
  const systems = ref<System[]>([])

  // ── Per-system maps (persistent across home/system views) ───────────────────
  const modulesBySystem = ref<Record<string, Module[]>>({})

  // ── Current system context ───────────────────────────────────────────────────
  const currentSystem = ref<System | null>(null)

  // ── Computed shortcuts for system view ──────────────────────────────────────
  const modules = computed((): Module[] =>
    currentSystem.value ? (modulesBySystem.value[currentSystem.value.id] ?? []) : [],
  )

  // ── Systems list actions ─────────────────────────────────────────────────────
  async function fetchSystems(): Promise<void> {
    const result = await get<ApiCollection<System>>('/systems')
    if (result.ok) {
      systems.value = result.data.data
    }
  }

  async function createSystem(data: CreateSystemRequest): Promise<ApiResult<System>> {
    const result = await post<ApiResource<System>, CreateSystemRequest>('/systems', data)
    if (result.ok) {
      systems.value.push(result.data.data)
      const membershipStore = useMembershipStore()
      await Promise.all([membershipStore.fetchMemberships(), membershipStore.fetchSubscriptions()])
      return { ok: true, data: result.data.data }
    }
    return result
  }

  async function deleteSystem(id: string): Promise<ApiResult<void>> {
    const result = await del<void>(`/systems/${id}`)
    if (result.ok) {
      systems.value = systems.value.filter((s) => s.id !== id)
    }
    return result
  }

  async function updateSystem(
    systemId: string,
    data: Partial<{ name: string; description: string | null; config: Partial<import('@/types/domain').SystemConfig> }>,
  ): Promise<ApiResult<System>> {
    const system = currentSystem.value ?? systems.value.find((s) => s.id === systemId)
    const payload = {
      slug: system?.slug ?? '',
      name: system?.name ?? '',
      description: system?.description ?? '',
      ...data,
    }
    const result = await put<ApiResource<System>, typeof payload>(`/systems/${systemId}`, payload)
    if (result.ok) {
      currentSystem.value = result.data.data
      const idx = systems.value.findIndex((s) => s.id === systemId)
      if (idx !== -1) systems.value[idx] = result.data.data
      return { ok: true, data: result.data.data }
    }
    return result
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  const initialized = ref(false)

  async function init(force = false): Promise<void> {
    if (initialized.value && !force) return

    const membershipStore = useMembershipStore()

    await Promise.all([
      fetchSystems(),
      membershipStore.fetchMemberships(),
      membershipStore.fetchSubscriptions(),
    ])

    initialized.value = true
  }

  // ── System entry / exit ──────────────────────────────────────────────────────
  async function enterSystem(systemId: string): Promise<void> {
    const [systemResult, modulesResult] = await Promise.all([
      get<ApiResource<System>>(`/systems/${systemId}`),
      get<ApiCollection<Module>>(`/systems/${systemId}/modules`),
    ])

    if (systemResult.ok) {
      currentSystem.value = systemResult.data.data
    }

    if (modulesResult.ok) {
      modulesBySystem.value[systemId] = modulesResult.data.data
    }
  }

  function exitSystem(): void {
    currentSystem.value = null
  }

  // ── Module actions ───────────────────────────────────────────────────────────
  async function fetchModules(systemId: string): Promise<void> {
    const result = await get<ApiCollection<Module>>(`/systems/${systemId}/modules`)
    if (result.ok) {
      modulesBySystem.value[systemId] = result.data.data
    }
  }

  async function createModule(systemId: string, data: CreateModuleRequest): Promise<ApiResult<Module>> {
    const result = await post<ApiResource<Module>, CreateModuleRequest>(`/systems/${systemId}/modules`, data)
    if (result.ok) {
      const existing = modulesBySystem.value[systemId] ?? []
      modulesBySystem.value[systemId] = [...existing, result.data.data]
      await useMembershipStore().fetchSubscriptions()
      return { ok: true, data: result.data.data }
    }
    return result
  }

  async function deleteModule(systemId: string, moduleId: string): Promise<ApiResult<void>> {
    const result = await del<void>(`/systems/${systemId}/modules/${moduleId}`)
    if (result.ok) {
      const existing = modulesBySystem.value[systemId] ?? []
      modulesBySystem.value[systemId] = existing.filter((m) => m.id !== moduleId)
    }
    return result
  }

  return {
    // state
    systems,
    modulesBySystem,
    currentSystem,
    // computed
    modules,
    // api state
    loading,
    // systems
    fetchSystems,
    createSystem,
    deleteSystem,
    updateSystem,
    // bootstrap
    init,
    initialized,
    // system context
    enterSystem,
    exitSystem,
    // modules
    fetchModules,
    createModule,
    deleteModule,
  }
})
