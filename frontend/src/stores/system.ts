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
  CreateSystemRequest,
  CreateModuleRequest,
} from '@/types/domain'

export const useSystemStore = defineStore('system', () => {
  const { get, post, put, del, loading, errors } = useApi()

  // ── Systems list (home/browse view) ─────────────────────────────────────────
  const systems = ref<System[]>([])

  // ── Per-system maps (persistent across home/system views) ───────────────────
  const modulesBySystem = ref<Record<string, Module[]>>({})
  const membershipsBySystem = ref<Record<string, Membership | null>>({})

  // ── Flat subscription map (all user subscriptions, keyed by moduleId) ───────
  const subscriptions = ref<Record<string, { id: string; editor: boolean } | null>>({})

  // ── Current system context ───────────────────────────────────────────────────
  const currentSystem = ref<System | null>(null)

  // ── Computed shortcuts for system view ──────────────────────────────────────
  const modules = computed((): Module[] =>
    currentSystem.value ? (modulesBySystem.value[currentSystem.value.id] ?? []) : [],
  )
  const membership = computed((): Membership | null =>
    currentSystem.value ? (membershipsBySystem.value[currentSystem.value.id] ?? null) : null,
  )

  // ── Systems list actions ─────────────────────────────────────────────────────
  async function fetchSystems() {
    const result = await get<{ data: System[] }>('/systems')
    if (result) {
      systems.value = result.data
    }
  }

  async function createSystem(data: CreateSystemRequest) {
    const result = await post<{ data: System }, CreateSystemRequest>('/systems', data)
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
    const result = await get<{ data: Membership[] }>('/me/memberships')
    if (result) {
      const map: Record<string, Membership | null> = {}
      for (const m of result.data) {
        map[m.system_id] = m
      }
      membershipsBySystem.value = map
    }
  }

  async function fetchUserSubscriptions() {
    const result = await get<{ data: Subscription[] }>('/me/subscriptions')
    if (result) {
      const map: Record<string, { id: string; editor: boolean } | null> = {}
      for (const s of result.data) {
        map[s.module_id] = { id: s.id, editor: s.editor }
      }
      subscriptions.value = map
    }
  }

  // ── System entry / exit ──────────────────────────────────────────────────────
  async function enterSystem(systemId: string) {
    const [systemResult, modulesResult, membershipsResult, subscriptionsResult] = await Promise.all([
      get<{ data: System }>(`/systems/${systemId}`),
      get<{ data: Module[] }>(`/systems/${systemId}/modules`),
      get<{ data: Membership[] }>('/me/memberships'),
      get<{ data: Subscription[] }>('/me/subscriptions'),
    ])

    if (systemResult) {
      currentSystem.value = systemResult.data
    }

    if (modulesResult) {
      modulesBySystem.value[systemId] = modulesResult.data
    }

    if (membershipsResult) {
      for (const m of membershipsResult.data) {
        membershipsBySystem.value[m.system_id] = m
      }
    }

    if (subscriptionsResult) {
      const map: Record<string, { id: string; editor: boolean } | null> = {}
      for (const s of subscriptionsResult.data) {
        map[s.module_id] = { id: s.id, editor: s.editor }
      }
      subscriptions.value = map
    }
  }

  function exitSystem() {
    currentSystem.value = null
  }

  // ── Module actions ───────────────────────────────────────────────────────────
  async function fetchModules(systemId: string) {
    const result = await get<{ data: Module[] }>(`/systems/${systemId}/modules`)
    if (result) {
      modulesBySystem.value[systemId] = result.data
    }
  }

  async function createModule(systemId: string, data: CreateModuleRequest) {
    const result = await post<{ data: Module }, CreateModuleRequest>(`/systems/${systemId}/modules`, data)
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
    const result = await get<{ data: Membership[] }>('/me/memberships')
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
  async function subscribe(systemId: string, moduleId: string) {
    const result = await post<{ data: Subscription }>(
      `/systems/${systemId}/modules/${moduleId}/subscriptions`,
      {},
    )
    if (result) {
      subscriptions.value[moduleId] = { id: result.data.id, editor: result.data.editor }
      await fetchUserMemberships()
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
  async function fetchSystemMemberships(systemId: string) {
    const result = await get<{ data: MembershipWithUser[] }>(`/systems/${systemId}/memberships`)
    return result?.data ?? []
  }

  async function updateMembershipAdmin(systemId: string, membershipId: string, admin: boolean) {
    const result = await put<{ data: MembershipWithUser }, { admin: boolean }>(
      `/systems/${systemId}/memberships/${membershipId}`,
      { admin },
    )
    return result?.data ?? null
  }

  async function fetchModuleSubscriptions(systemId: string, moduleId: string) {
    const result = await get<{ data: SubscriptionWithUser[] }>(
      `/systems/${systemId}/modules/${moduleId}/subscriptions`,
    )
    return result?.data ?? []
  }

  async function updateSubscriptionEditor(
    systemId: string,
    moduleId: string,
    subscriptionId: string,
    editor: boolean,
  ) {
    const result = await put<{ data: SubscriptionWithUser }, { editor: boolean }>(
      `/systems/${systemId}/modules/${moduleId}/subscriptions/${subscriptionId}`,
      { editor },
    )
    return result?.data ?? null
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
    subscribe,
    unsubscribe,
    // admin management
    fetchSystemMemberships,
    updateMembershipAdmin,
    fetchModuleSubscriptions,
    updateSubscriptionEditor,
  }
})
