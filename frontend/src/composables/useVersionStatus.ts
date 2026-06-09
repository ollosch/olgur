import { computed } from 'vue'
import { toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'

import { useContentStore } from '@/stores/content'

export function useVersionStatus(moduleId: MaybeRefOrGetter<string>): {
  versionString: ComputedRef<string | null>
  revision: ComputedRef<number>
  hasReleasedVersion: ComputedRef<boolean>
  displayVersion: ComputedRef<string>
  isDesigner: ComputedRef<boolean>
} {
  const contentStore = useContentStore()

  const versionString: ComputedRef<string | null> = computed(
    () => contentStore.manifestByModule[toValue(moduleId)]?.version_string ?? null,
  )

  const revision: ComputedRef<number> = computed(
    () => contentStore.manifestByModule[toValue(moduleId)]?.revision ?? 0,
  )

  const hasReleasedVersion: ComputedRef<boolean> = computed(() => versionString.value !== null)

  const displayVersion: ComputedRef<string> = computed(() => {
    if (!hasReleasedVersion.value) return 'No released version'
    const ver = `v${versionString.value}`
    return revision.value > 0 ? `${ver} rev${revision.value}` : ver
  })

  const isDesigner: ComputedRef<boolean> = computed(() => contentStore.isDesigner)

  return {
    versionString,
    revision,
    hasReleasedVersion,
    displayVersion,
    isDesigner,
  }
}
