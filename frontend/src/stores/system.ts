import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import type {
  System,
  Module,
  Membership,
  MembershipWithUser,
  Subscription,
  SubscriptionWithUser,
  UserSubscription,
  CreateSystemRequest,
  CreateModuleRequest,
  ApiResource,
  ApiCollection,
} from '@/types/domain'

export const useSystemStore = defineStore('system', () => {
  const { get, post, put, del, loading, errors } = useApi()

  // ── Systems list (home/browse view) ─────────────────────────────────────────
  const systems = ref<System[]>([])

  // ── Per-system maps (persistent across home/system views) ───────────────────
  const modulesBySystem = ref<Record<string, Module[]>>({})
  const membershipsBySystem = ref<Record<string, Membership | null>>({})

  // ── Flat subscription map (all user subscriptions, keyed by moduleId) ───────
  const subscriptions = ref<Record<string, UserSubscription | null>>({})

  // ── Current system context ───────────────────────────────────────────────────
  const currentSystem = ref<System | null>(null)

  // ── Computed shortcuts for system view ──────────────────────────────────────
  const modules = computed((): Module[] =>
    currentSystem.value ? (modulesBySystem.value[currentSystem.value.id] ?? []) : [],
  )
  const membership = computed((): Membership | null =>
    currentSystem.value ? (membershipsBySystem.value[currentSystem.value.id] ?? null) : null,
  )

  // ── Computed shortcuts for home view ────────────────────────────────────────
  const sortedSystems = computed((): System[] =>
    [...systems.value].sort((a, b) => {
      const aMember = !!membershipsBySystem.value[a.id]
      const bMember = !!membershipsBySystem.value[b.id]
      if (aMember && !bMember) return -1
      if (!aMember && bMember) return 1
      return 0
    }),
  )

  const memberSystems = computed((): System[] =>
    sortedSystems.value.filter((s) => !!membershipsBySystem.value[s.id]),
  )

  const otherSystems = computed((): System[] =>
    sortedSystems.value.filter((s) => !membershipsBySystem.value[s.id]),
  )

  // ── Systems list actions ─────────────────────────────────────────────────────
  async function fetchSystems() {
    const result = await get<ApiCollection<System>>('/systems')
    if (result) {
      systems.value = result.data
    }
  }

  async function createSystem(data: CreateSystemRequest) {
    const result = await post<ApiResource<System>, CreateSystemRequest>('/systems', data)
    if (result) {
      systems.value.push(result.data)
      await Promise.all([fetchUserMemberships(), fetchUserSubscriptions()])
    }
    return result?.data ?? null
  }

  async function deleteSystem(id: string) {
    await del(`/systems/${id}`)
    if (!errors.value) {
      systems.value = systems.value.filter((s) => s.id !== id)
    }
  }

  // ── Membership / subscription bootstrap (home view) ─────────────────────────
  async function fetchUserMemberships() {
    const result = await get<ApiCollection<Membership>>('/me/memberships')
    if (result) {
      const map: Record<string, Membership | null> = {}
      for (const m of result.data) {
        map[m.system_id] = m
      }
      membershipsBySystem.value = map
    }
  }

  async function fetchUserSubscriptions() {
    const result = await get<ApiCollection<Subscription>>('/me/subscriptions')
    if (result) {
      const map: Record<string, UserSubscription | null> = {}
      for (const s of result.data) {
        map[s.module_id] = { id: s.id, editor: s.editor }
      }
      subscriptions.value = map
    }
  }

  // ── System entry / exit ──────────────────────────────────────────────────────
  async function enterSystem(systemId: string) {
    const [systemResult, modulesResult] = await Promise.all([
      get<ApiResource<System>>(`/systems/${systemId}`),
      get<ApiCollection<Module>>(`/systems/${systemId}/modules`),
    ])

    if (systemResult) {
      currentSystem.value = systemResult.data
    }

    if (modulesResult) {
      modulesBySystem.value[systemId] = modulesResult.data
    }
  }

  function exitSystem() {
    currentSystem.value = null
  }

  // ── Module actions ───────────────────────────────────────────────────────────
  async function fetchModules(systemId: string) {
    const result = await get<ApiCollection<Module>>(`/systems/${systemId}/modules`)
    if (result) {
      modulesBySystem.value[systemId] = result.data
    }
  }

  async function createModule(systemId: string, data: CreateModuleRequest) {
    const result = await post<ApiResource<Module>, CreateModuleRequest>(`/systems/${systemId}/modules`, data)
    if (result) {
      const existing = modulesBySystem.value[systemId] ?? []
      modulesBySystem.value[systemId] = [...existing, result.data]
      await fetchUserSubscriptions()
    }
    return result?.data ?? null
  }

  async function deleteModule(systemId: string, moduleId: string) {
    await del(`/systems/${systemId}/modules/${moduleId}`)
    if (!errors.value) {
      const existing = modulesBySystem.value[systemId] ?? []
      modulesBySystem.value[systemId] = existing.filter((m) => m.id !== moduleId)
    }
  }

  // ── Membership / module activation ──────────────────────────────────────────
  async function refreshMembership(systemId: string) {
    const result = await get<ApiCollection<Membership>>('/me/memberships')
    if (result) {
      const found = result.data.find((m) => m.system_id === systemId) ?? null
      membershipsBySystem.value[systemId] = found
    }
  }

  async function activateModule(systemId: string, moduleId: string) {
    const system = systems.value.find((s) => s.id === systemId) ?? currentSystem.value
    const structure = system?.config?.system_structure
    const currentMembership = membershipsBySystem.value[systemId]

    if (
      (structure === 'core_plus_one' || structure === 'grouping_only') &&
      currentMembership?.config?.active_module_ids
    ) {
      const activeIds = [...currentMembership.config.active_module_ids]
      for (const id of activeIds) {
        await del(`/systems/${systemId}/modules/${id}/activate`)
      }
    }

    await post(`/systems/${systemId}/modules/${moduleId}/activate`)
    await refreshMembership(systemId)
  }

  async function deactivateModule(systemId: string, moduleId: string) {
    await del(`/systems/${systemId}/modules/${moduleId}/activate`)
    await refreshMembership(systemId)
  }

  // ── Subscription actions ─────────────────────────────────────────────────────
  /**
   * Returns true if the user can subscribe to the given module.
   * For `core_plus_many` systems, non-core modules require an active core subscription first.
   */
  function canSubscribeToModule(systemId: string, moduleId: string): boolean {
    const system = systems.value.find((s) => s.id === systemId) ?? currentSystem.value
    const mods = modulesBySystem.value[systemId] ?? []
    const mod = mods.find((m) => m.id === moduleId)
    if (!mod) return false
    if (mod.is_core) return true
    if (system?.config?.system_structure === 'core_plus_many') {
      return mods.some((m) => m.is_core && !!subscriptions.value[m.id])
    }
    return true
  }

  async function subscribe(systemId: string, moduleId: string) {
    const result = await post<ApiResource<Subscription>>(
      `/systems/${systemId}/modules/${moduleId}/subscriptions`,
      {},
    )
    if (result) {
      subscriptions.value[moduleId] = { id: result.data.id, editor: result.data.editor }
      await fetchUserMemberships()
      // Auto-activate non-core modules so their rules appear immediately.
      const mod = (modulesBySystem.value[systemId] ?? []).find((m) => m.id === moduleId)
      if (mod && !mod.is_core) {
        await activateModule(systemId, moduleId)
      }
    }
  }

  async function unsubscribe(systemId: string, moduleId: string) {
    const sub = subscriptions.value[moduleId]
    if (!sub) return

    await del(`/systems/${systemId}/modules/${moduleId}/subscriptions/${sub.id}`)
    subscriptions.value[moduleId] = null
    await fetchUserMemberships()
  }

  // ── Admin management ─────────────────────────────────────────────────────────
  const adminMemberships = ref<MembershipWithUser[]>([])
  const adminSubscriptionsByModule = ref<Record<string, SubscriptionWithUser[]>>({})
  const adminLoading = ref(false)

  async function fetchSystemMemberships(systemId: string): Promise<void> {
    const result = await get<ApiCollection<MembershipWithUser>>(`/systems/${systemId}/memberships`)
    if (result) {
      adminMemberships.value = result.data
    }
  }

  async function updateMembershipAdmin(systemId: string, membershipId: string, admin: boolean): Promise<void> {
    const result = await put<ApiResource<MembershipWithUser>, { admin: boolean }>(
      `/systems/${systemId}/memberships/${membershipId}`,
      { admin },
    )
    if (result) {
      const idx = adminMemberships.value.findIndex((m) => m.id === membershipId)
      if (idx !== -1) {
        adminMemberships.value[idx] = { ...adminMemberships.value[idx]!, admin: result.data.admin }
      }
    }
  }

  async function fetchModuleSubscriptions(systemId: string, moduleId: string): Promise<void> {
    const result = await get<ApiCollection<SubscriptionWithUser>>(
      `/systems/${systemId}/modules/${moduleId}/subscriptions`,
    )
    if (result) {
      adminSubscriptionsByModule.value[moduleId] = result.data
    }
  }

  async function updateSubscriptionEditor(
    systemId: string,
    moduleId: string,
    subscriptionId: string,
    editor: boolean,
  ): Promise<void> {
    const result = await put<ApiResource<SubscriptionWithUser>, { editor: boolean }>(
      `/systems/${systemId}/modules/${moduleId}/subscriptions/${subscriptionId}`,
      { editor },
    )
    if (result) {
      const list = adminSubscriptionsByModule.value[moduleId] ?? []
      const idx = list.findIndex((s) => s.id === subscriptionId)
      if (idx !== -1) {
        list[idx] = { ...list[idx]!, editor: result.data.editor }
      }
    }
  }

  async function loadAdminData(systemId: string): Promise<void> {
    adminLoading.value = true
    const modules = modulesBySystem.value[systemId] ?? []
    await Promise.all([
      fetchSystemMemberships(systemId),
      ...modules.map((m) => fetchModuleSubscriptions(systemId, m.id)),
    ])
    adminLoading.value = false
  }

  function setMembership(systemId: string, membership: Membership): void {
    membershipsBySystem.value[systemId] = membership
  }

  return {
    // state
    systems,
    modulesBySystem,
    membershipsBySystem,
    subscriptions,
    currentSystem,
    // computed
    modules,
    membership,
    sortedSystems,
    memberSystems,
    otherSystems,
    // api state
    loading,
    errors,
    // systems
    fetchSystems,
    createSystem,
    deleteSystem,
    // bootstrap
    fetchUserMemberships,
    fetchUserSubscriptions,
    // system context
    enterSystem,
    exitSystem,
    // modules
    fetchModules,
    createModule,
    deleteModule,
    // activation
    activateModule,
    deactivateModule,
    // subscriptions
    canSubscribeToModule,
    subscribe,
    unsubscribe,
    // admin management
    adminMemberships,
    adminSubscriptionsByModule,
    adminLoading,
    loadAdminData,
    fetchSystemMemberships,
    updateMembershipAdmin,
    fetchModuleSubscriptions,
    updateSubscriptionEditor,
    setMembership,
  }
})
