import { computed, ref } from 'vue'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import type { BrokenReference } from '@/types/domain'

/**
 * State and access for the system-wide broken-link lint.
 *
 * `canLint` mirrors the backend authorization (system admin or module editor)
 * and is used to gate the lint entry point. `run()` fetches results through the
 * content store and swallows errors so a failed lint never crashes the editor.
 */
export function useBrokenLinks() {
  const contentStore = useContentStore()
  const systemStore = useSystemStore()

  const results = ref<BrokenReference[]>([])
  const loading = ref(false)

  const canLint = computed((): boolean => {
    if (systemStore.currentSystem?.permissions?.['system.manage']) return true
    return systemStore.modules.some((m) => m.permissions?.['content.edit'] ?? false)
  })

  async function run(systemId: string): Promise<void> {
    loading.value = true
    try {
      const result = await contentStore.fetchLint(systemId)
      results.value = result.ok ? result.data : []
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }

  return { results, loading, canLint, run }
}
