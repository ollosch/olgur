import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { useApi } from '@/composables/useApi'
import { isApiError } from '@/lib/http'
import type { DraftChangeClassification, ModuleDraftChange } from '@/types/domain'

export interface DraftChangeGroup {
  key: string
  entityType: ModuleDraftChange['entity_type']
  entityId: string
  changes: ModuleDraftChange[]
  classification: DraftChangeClassification
  label: string
}

export interface DraftChangeTextField {
  key: string
  value: string
}

const ENTITY_TEXT_FIELDS: Record<ModuleDraftChange['entity_type'], string[]> = {
  rule: ['title', 'content'],
  index_entry: ['term', 'definition', 'notes'],
  game_datum: ['name'],
}

const ENTITY_LABEL_FIELDS: Record<ModuleDraftChange['entity_type'], string> = {
  rule: 'title',
  index_entry: 'term',
  game_datum: 'name',
}

function readString(content: Record<string, unknown> | null, key: string): string | null {
  if (!content) return null
  const value = content[key]
  return typeof value === 'string' ? value : null
}

export function draftChangeLabel(change: ModuleDraftChange): string {
  const field = ENTITY_LABEL_FIELDS[change.entity_type]
  return (
    readString(change.content_after, field) ??
    readString(change.content_before, field) ??
    change.entity_id
  )
}

export function draftChangeTextFields(change: ModuleDraftChange): DraftChangeTextField[] {
  const fields = ENTITY_TEXT_FIELDS[change.entity_type]
  return fields.map((key) => ({
    key,
    value:
      readString(change.content_after, key) ?? readString(change.content_before, key) ?? '',
  }))
}

function groupKey(change: ModuleDraftChange): string {
  return `${change.entity_type}:${change.entity_id}`
}

export function useDraftReview(
  systemId: string,
  moduleId: string,
): {
  draftRevision: Ref<number>
  changes: Ref<ModuleDraftChange[]>
  groups: ComputedRef<DraftChangeGroup[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  load: () => Promise<void>
  setGroupClassification: (
    group: DraftChangeGroup,
    classification: DraftChangeClassification,
  ) => Promise<void>
} {
  const { get, patch } = useApi()

  const draftRevision = ref(0)
  const changes = ref<ModuleDraftChange[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const groups = computed((): DraftChangeGroup[] => {
    const map = new Map<string, ModuleDraftChange[]>()

    for (const change of changes.value) {
      const key = groupKey(change)
      const existing = map.get(key)
      if (existing) {
        existing.push(change)
      } else {
        map.set(key, [change])
      }
    }

    return [...map.entries()].map(([key, groupChanges]) => ({
      key,
      entityType: groupChanges[0]!.entity_type,
      entityId: groupChanges[0]!.entity_id,
      changes: groupChanges,
      classification: groupChanges.some((c) => c.classification === 'semantic')
        ? 'semantic'
        : 'typo',
      label: draftChangeLabel(groupChanges[groupChanges.length - 1]!),
    }))
  })

  async function load(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await get<{ data: ModuleDraftChange[]; draft_revision: number }>(
        `/systems/${systemId}/modules/${moduleId}/draft-changes?pending=1`,
      )
      if (result.ok) {
        changes.value = result.data.data
        draftRevision.value = result.data.draft_revision
      } else {
        error.value = 'Failed to load pending draft changes.'
      }
    } catch (e) {
      error.value =
        isApiError(e) && 'message' in e && e.message
          ? e.message
          : 'Failed to load pending draft changes.'
    } finally {
      loading.value = false
    }
  }

  async function setGroupClassification(
    group: DraftChangeGroup,
    classification: DraftChangeClassification,
  ): Promise<void> {
    error.value = null

    try {
      const results = await Promise.all(
        group.changes.map((change) =>
          patch<unknown, { classification: DraftChangeClassification }>(
            `/systems/${systemId}/modules/${moduleId}/draft-changes/${change.id}`,
            { classification },
          ),
        ),
      )

      const failed = results.find((result) => !result.ok)
      if (failed && !failed.ok) {
        error.value =
          Object.values(failed.errors)[0] ?? 'Failed to reclassify draft changes.'
        return
      }

      for (const change of group.changes) {
        change.classification = classification
      }
    } catch (e) {
      error.value =
        isApiError(e) && 'message' in e && e.message
          ? e.message
          : 'Failed to reclassify draft changes.'
    }
  }

  return {
    draftRevision,
    changes,
    groups,
    loading,
    error,
    load,
    setGroupClassification,
  }
}
