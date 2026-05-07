import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSystemStore } from '@/stores/system'

/**
 * Returns authorization helpers for the current user within the current system context.
 *
 * canEdit(moduleId) — true if the user is a super_admin, system admin, or an editor
 * of the given module.
 */
export function useAuthorization() {
  const authStore = useAuthStore()
  const systemStore = useSystemStore()

  const canEdit = computed(() => (moduleId: string): boolean => {
    const user = authStore.user
    if (!user) return false
    if (user.super_admin) return true
    if (systemStore.membership?.admin) return true
    return !!systemStore.subscriptions[moduleId]?.editor
  })

  return { canEdit }
}
