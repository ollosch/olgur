import { computed } from 'vue'
import { useContentStore } from '@/stores/content'
import { useOnline } from '@/composables/useOnline'

/**
 * Returns authorization helpers for the current user within the current system context.
 *
 * canEdit(moduleId) — true when the API-supplied permission map grants
 * `content.edit` for the given module. When offline the app degrades to
 * read-only and canEdit always returns false.
 */
export function useAuthorization() {
  const contentStore = useContentStore()
  const { offline } = useOnline()

  const canEdit = computed(
    () =>
      (moduleId: string): boolean =>
        !offline.value && contentStore.canEditModule(moduleId),
  )

  return { canEdit }
}
