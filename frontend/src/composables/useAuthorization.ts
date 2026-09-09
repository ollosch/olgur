import { computed } from 'vue'
import { useContentStore } from '@/stores/content'

/**
 * Returns authorization helpers for the current user within the current system context.
 *
 * canEdit(moduleId) — true when the API-supplied permission map grants
 * `content.edit` for the given module.
 */
export function useAuthorization() {
  const contentStore = useContentStore()

  const canEdit = computed(() => (moduleId: string): boolean => contentStore.canEditModule(moduleId))

  return { canEdit }
}
