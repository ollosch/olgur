import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { useApi } from '@/composables/useApi'
import { request } from '@/lib/http'
import { useContentStore } from '@/stores/content'
import type { AmendVersionRequest, ApiCollection, ApiResource, Rule } from '@/types/domain'

interface AmendResponse {
  revision: number
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
  expectedRevision: Ref<number>
  loadReleasedContent: (manifestRulesUrl: string) => Promise<void>
  applyAmendment: () => Promise<void>
  applyDraftFix: () => Promise<void>
} {
  const { get, patch } = useApi()
  const contentStore = useContentStore()

  const releasedContent: Ref<string> = ref('')
  const draftContent: Ref<string> = ref('')
  const isLoading: Ref<boolean> = ref(false)
  const errors: Ref<Record<string, string> | null> = ref(null)
  const expectedRevision: Ref<number> = ref(0)

  /**
   * The snapshot `id` of the released rule matched by `rule_id`. The backend
   * amend endpoint resolves `RuleVersion` by snapshot id, so this must be used
   * as `entity_id` rather than the stable live `ruleId`.
   */
  const releasedRuleId: Ref<string> = ref('')

  /**
   * The live draft rule as fetched from the live draft endpoint (or the store
   * as a fallback). Held here so back-porting a correction updates the live
   * record rather than a released snapshot from `rulesByModule`.
   */
  const liveDraftRule: Ref<Rule | null> = ref(null)

  /**
   * True when the released version text differs from the current draft text
   * (trimmed comparison). Determines whether to render single or dual editor.
   */
  const isDiverged: ComputedRef<boolean> = computed(
    () => releasedContent.value.trim() !== draftContent.value.trim(),
  )

  function findStoreDraft(): Rule | null {
    return (contentStore.rulesByModule[moduleId] ?? []).find((r) => r.id === ruleId) ?? null
  }

  /**
   * Loads the live draft rule explicitly. In Release mode `rulesByModule`
   * contains the released snapshot, so the store is only a fallback when the
   * live draft request fails; otherwise the comparison would be meaningless.
   */
  async function loadLiveDraft(): Promise<Rule | null> {
    try {
      const result = await get<ApiCollection<Rule>>(
        `/systems/${systemId}/modules/${moduleId}/rules`,
      )
      if (!result.ok) return findStoreDraft()
      return result.data.data.find((r) => r.id === ruleId) ?? null
    } catch {
      return findStoreDraft()
    }
  }

  /**
   * Fetches the versioned rules at `manifestRulesUrl`, finds the rule by its
   * stable `rule_id` (matching `ruleId`), and populates `releasedContent` while
   * capturing the snapshot `id`. Also loads the live draft rule explicitly and
   * seeds `expectedRevision` from the manifest so both values are ready for the
   * divergence check and the optimistic-concurrency back-edit.
   */
  async function loadReleasedContent(manifestRulesUrl: string): Promise<void> {
    isLoading.value = true
    errors.value = null

    try {
      const draftRule = await loadLiveDraft()
      liveDraftRule.value = draftRule
      if (draftRule) {
        draftContent.value = draftRule.content.split('<br>').join('\n')
      }

      // Seed the expected snapshot revision from the manifest
      expectedRevision.value = contentStore.manifestByModule[moduleId]?.revision ?? 0

      // Fetch and normalise the released version. The versioned endpoint returns
      // a bare JSON array. The released snapshot carries both a snapshot `id`
      // and a stable `rule_id`; match on `rule_id` and capture the snapshot `id`
      // for the amend `entity_id`.
      const json = await request<Rule[] | ApiCollection<Rule>>({
        method: 'GET',
        url: manifestRulesUrl,
      })
      const items = Array.isArray(json) ? json : json.data
      const releasedRule = items.find((r) => r.rule_id === ruleId)
      if (releasedRule) {
        releasedRuleId.value = releasedRule.id
        releasedContent.value = releasedRule.content.split('<br>').join('\n')
      }
    } catch {
      errors.value = { load: 'Failed to load released version.' }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * PATCHes the latest-version back-edit endpoint, submitting the expected
   * snapshot revision for optimistic concurrency and the edited released text.
   */
  async function applyAmendment(): Promise<void> {
    errors.value = null

    const result = await patch<ApiResource<AmendResponse>, AmendVersionRequest>(
      `/systems/${systemId}/modules/${moduleId}/versions/${versionId}/amend`,
      {
        entity_type: 'rule',
        entity_id: releasedRuleId.value,
        expected_revision: expectedRevision.value,
        // Re-normalise newlines to <br> for the backend storage format
        content: { content: releasedContent.value.split('\n').join('<br>') },
      },
    )

    if (!result.ok) {
      errors.value = result.errors
      return
    }

    await contentStore.fetchManifest(systemId)

    const revision = result.data?.data?.revision
    if (revision !== undefined) {
      expectedRevision.value = revision
    }
  }

  /**
   * PATCHes the live draft rule via the content store. Preserves all other
   * live fields and only updates the content text.
   */
  async function applyDraftFix(): Promise<void> {
    errors.value = null

    const rule = liveDraftRule.value ?? findStoreDraft()
    if (!rule) return

    const result = await contentStore.updateRule(systemId, rule, {
      number: rule.number,
      title: rule.title,
      content: draftContent.value,
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
    expectedRevision,
    loadReleasedContent,
    applyAmendment,
    applyDraftFix,
  }
}
