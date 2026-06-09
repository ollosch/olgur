import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { useApi } from '@/composables/useApi'
import { request } from '@/lib/http'
import { useContentStore } from '@/stores/content'
import type { ApiCollection, ApiResource, ModuleVersionAmendment, Rule } from '@/types/domain'

interface AmendmentRequest {
  entity_type: 'rule'
  entity_id: string
  change_type: 'correction' | 'update'
  description: string
  content: Record<string, unknown>
}

export function useRetrofix(
  systemId: string,
  moduleId: string,
  versionId: string,
  ruleId: string,
): {
  releasedContent: Ref<string>
  draftContent: Ref<string>
  isDiverged: ComputedRef<boolean>
  isLoading: Ref<boolean>
  errors: Ref<Record<string, string> | null>
  loadReleasedContent: (manifestRulesUrl: string) => Promise<void>
  applyAmendment: (changeType: 'correction' | 'update', description: string) => Promise<void>
  applyDraftFix: () => Promise<void>
} {
  const { post } = useApi()
  const contentStore = useContentStore()

  const releasedContent: Ref<string> = ref('')
  const draftContent: Ref<string> = ref('')
  const isLoading: Ref<boolean> = ref(false)
  const errors: Ref<Record<string, string> | null> = ref(null)

  /**
   * True when the released version text differs from the current draft text
   * (trimmed comparison). Determines whether to render single or dual editor.
   */
  const isDiverged: ComputedRef<boolean> = computed(
    () => releasedContent.value.trim() !== draftContent.value.trim(),
  )

  /**
   * Fetches the versioned rules file at `manifestRulesUrl`, finds the rule by
   * `ruleId`, and populates `releasedContent`. Also seeds `draftContent` from
   * the live store so both values are ready for the divergence check.
   */
  async function loadReleasedContent(manifestRulesUrl: string): Promise<void> {
    isLoading.value = true
    errors.value = null

    try {
      // Seed draft content from the live store
      const storeRules = contentStore.rulesByModule[moduleId] ?? []
      const draftRule = storeRules.find((r) => r.id === ruleId)
      if (draftRule) {
        draftContent.value = draftRule.content
      }

      // Fetch and normalise the released version
      const json = await request<ApiCollection<Rule>>({ method: 'GET', url: manifestRulesUrl })
      const releasedRule = json.data.find((r) => r.id === ruleId)
      if (releasedRule) {
        releasedContent.value = releasedRule.content.split('<br>').join('\n')
      }
    } catch {
      errors.value = { load: 'Failed to load released version.' }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * POSTs an amendment record to the backend. Reads the current value of
   * `releasedContent` so any edits the designer made are preserved.
   */
  async function applyAmendment(
    changeType: 'correction' | 'update',
    description: string,
  ): Promise<void> {
    errors.value = null

    const result = await post<ApiResource<ModuleVersionAmendment>, AmendmentRequest>(
      `/systems/${systemId}/modules/${moduleId}/versions/${versionId}/amendments`,
      {
        entity_type: 'rule',
        entity_id: ruleId,
        change_type: changeType,
        description,
        // Re-normalise newlines to <br> for the backend storage format
        content: { content: releasedContent.value.split('\n').join('<br>') },
      },
    )

    if (!result.ok) {
      errors.value = result.errors
    }
  }

  /**
   * PATCHes the draft rule via the content store. Preserves all other fields
   * and only updates the content text.
   */
  async function applyDraftFix(): Promise<void> {
    errors.value = null

    const storeRules = contentStore.rulesByModule[moduleId] ?? []
    const rule = storeRules.find((r) => r.id === ruleId)
    if (!rule) return

    const result = await contentStore.updateRule(systemId, rule, {
      number: rule.number,
      title: rule.title,
      content: draftContent.value,
      markdown: rule.markdown,
      parent_id: rule.parent_id,
      sort_order: rule.sort_order,
    })

    if (!result.ok) {
      errors.value = result.errors
    }
  }

  return {
    releasedContent,
    draftContent,
    isDiverged,
    isLoading,
    errors,
    loadReleasedContent,
    applyAmendment,
    applyDraftFix,
  }
}
