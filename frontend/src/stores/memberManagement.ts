import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useSystemStore } from '@/stores/system'
import type { ApiResult } from '@/lib/http'
import type {
  MembershipWithUser,
  SubscriptionWithUser,
  ApiCollection,
  ApiResource,
} from '@/types/domain'

export const useMemberManagementStore = defineStore('memberManagement', () => {
  const { get, put, loading } = useApi()
  const systemStore = useSystemStore()

  // ── State ────────────────────────────────────────────────────────────────────
  const adminMemberships = ref<MembershipWithUser[]>([])
  const adminSubscriptionsByModule = ref<Record<string, SubscriptionWithUser[]>>({})
  const adminLoading = ref(false)

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function fetchSystemMemberships(systemId: string): Promise<void> {
    const result = await get<ApiCollection<MembershipWithUser>>(`/systems/${systemId}/memberships`)
    if (result.ok) {
      adminMemberships.value = result.data.data
    }
  }

  async function updateMembershipAdmin(
    systemId: string,
    membershipId: string,
    admin: boolean,
  ): Promise<ApiResult<void>> {
    const result = await put<ApiResource<MembershipWithUser>, { admin: boolean }>(
      `/systems/${systemId}/memberships/${membershipId}`,
      { admin },
    )
    if (result.ok) {
      const idx = adminMemberships.value.findIndex((m) => m.id === membershipId)
      if (idx !== -1) {
        adminMemberships.value[idx] = {
          ...adminMemberships.value[idx]!,
          admin: result.data.data.admin,
        }
      }
      return { ok: true, data: undefined }
    }
    return result
  }

  async function fetchModuleSubscriptions(systemId: string, moduleId: string): Promise<void> {
    const result = await get<ApiCollection<SubscriptionWithUser>>(
      `/systems/${systemId}/modules/${moduleId}/subscriptions`,
    )
    if (result.ok) {
      adminSubscriptionsByModule.value[moduleId] = result.data.data
    }
  }

  async function updateSubscriptionEditor(
    systemId: string,
    moduleId: string,
    subscriptionId: string,
    editor: boolean,
  ): Promise<ApiResult<void>> {
    const result = await put<ApiResource<SubscriptionWithUser>, { editor: boolean }>(
      `/systems/${systemId}/modules/${moduleId}/subscriptions/${subscriptionId}`,
      { editor },
    )
    if (result.ok) {
      const list = adminSubscriptionsByModule.value[moduleId] ?? []
      const idx = list.findIndex((s) => s.id === subscriptionId)
      if (idx !== -1) {
        list[idx] = { ...list[idx]!, editor: result.data.data.editor }
      }
      return { ok: true, data: undefined }
    }
    return result
  }

  async function loadAdminData(systemId: string): Promise<void> {
    adminLoading.value = true
    const mods = systemStore.modulesBySystem[systemId] ?? []
    await Promise.all([
      fetchSystemMemberships(systemId),
      ...mods.map((m) => fetchModuleSubscriptions(systemId, m.id)),
    ])
    adminLoading.value = false
  }

  return {
    // state
    adminMemberships,
    adminSubscriptionsByModule,
    adminLoading,
    // api state
    loading,
    // actions
    fetchSystemMemberships,
    updateMembershipAdmin,
    fetchModuleSubscriptions,
    updateSubscriptionEditor,
    loadAdminData,
  }
})
