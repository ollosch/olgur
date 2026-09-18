import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useApi } from '@/composables/useApi'
import { useSystemStore } from '@/stores/system'
import type { ApiResult } from '@/lib/http'
import type {
  Membership,
  Subscription,
  UserSubscription,
  ApiCollection,
  ApiResource,
} from '@/types/domain'

export const useMembershipStore = defineStore('membership', () => {
  const { get, patch, loading } = useApi()
  const systemStore = useSystemStore()

  // ── Per-system maps ──────────────────────────────────────────────────────────
  const membershipsBySystem = ref<Record<string, Membership | null>>({})

  // ── Flat subscription map (all user subscriptions, keyed by moduleId) ────────
  const subscriptions = ref<Record<string, UserSubscription | null>>({})

  // ── Computed shortcuts for current system ─────────────────────────────────────
  const membership = computed((): Membership | null =>
    systemStore.currentSystem
      ? (membershipsBySystem.value[systemStore.currentSystem.id] ?? null)
      : null,
  )

  // ── Computed shortcuts for home view ──────────────────────────────────────────
  const sortedSystems = computed(() =>
    [...systemStore.systems].sort((a, b) => {
      const aMember = !!membershipsBySystem.value[a.id]
      const bMember = !!membershipsBySystem.value[b.id]
      if (aMember && !bMember) return -1
      if (!aMember && bMember) return 1
      return 0
    }),
  )

  const memberSystems = computed(() =>
    sortedSystems.value.filter((s) => !!membershipsBySystem.value[s.id]),
  )

  const otherSystems = computed(() =>
    sortedSystems.value.filter((s) => !membershipsBySystem.value[s.id]),
  )

  // ── Membership / subscription fetchers ────────────────────────────────────────
  async function fetchMemberships(): Promise<void> {
    const result = await get<ApiCollection<Membership>>('/me/memberships')
    if (result.ok) {
      const map: Record<string, Membership | null> = {}
      for (const m of result.data.data) {
        map[m.system_id] = m
      }
      membershipsBySystem.value = map
    }
  }

  async function fetchSubscriptions(): Promise<void> {
    const result = await get<ApiCollection<Subscription>>('/me/subscriptions')
    if (result.ok) {
      const map: Record<string, UserSubscription | null> = {}
      for (const s of result.data.data) {
        map[s.module_id] = { id: s.id, editor: s.editor }
      }
      subscriptions.value = map
    }
  }

  async function refreshMembership(systemId: string): Promise<void> {
    const result = await get<ApiCollection<Membership>>('/me/memberships')
    if (result.ok) {
      const found = result.data.data.find((m) => m.system_id === systemId) ?? null
      membershipsBySystem.value[systemId] = found
    }
  }

  // ── Subscription actions ───────────────────────────────────────────────────────
  /**
   * Subscriptions are durable entitlements granted by system administrators.
   * Users cannot self-subscribe or self-revoke.
   */

  async function updateMembership(
    systemId: string,
    config: Record<string, unknown>,
  ): Promise<ApiResult<void>> {
    const result = await patch<ApiResource<Membership>, { config: Record<string, unknown> }>(
      `/me/memberships/${systemId}`,
      { config },
    )
    if (result.ok) {
      membershipsBySystem.value[systemId] = result.data.data
      return { ok: true, data: undefined }
    }
    return result
  }

  function setMembership(systemId: string, newMembership: Membership): void {
    membershipsBySystem.value[systemId] = newMembership
  }

  return {
    // state
    membershipsBySystem,
    subscriptions,
    // api state
    loading,
    // computed
    membership,
    sortedSystems,
    memberSystems,
    otherSystems,
    // actions
    fetchMemberships,
    fetchSubscriptions,
    refreshMembership,
    updateMembership,
    setMembership,
  }
})
