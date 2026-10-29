<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { useSystemStore } from '@/stores/system'
import { useDraftReview, draftChangeTextFields } from '@/composables/useDraftReview'
import { isApiError } from '@/lib/http'
import type { DraftChangeGroup } from '@/composables/useDraftReview'
import type { DraftChangeClassification, ModuleDraftChange, ReleaseNote } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import DiscardChangesDialog from '@/components/DiscardChangesDialog.vue'

interface Props {
  systemId: string
  moduleId: string
  moduleName: string
  open: boolean
}

interface FormValues {
  version_string: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const systemStore = useSystemStore()
const { loading } = storeToRefs(systemStore)
const { createVersion } = systemStore

const review = useDraftReview(props.systemId, props.moduleId)
const { draftRevision, groups, loading: reviewLoading, error: reviewError } = review

useModalShortcutGuard(() => props.open)

const { defineField, handleSubmit, errors, setErrors, resetForm, meta } = useForm<FormValues>()

const [versionString] = defineField('version_string')

const notesByGroup = ref<Record<string, string>>({})
const submitError = ref<string | null>(null)

const semanticGroups = computed((): DraftChangeGroup[] =>
  groups.value.filter((group) => group.classification === 'semantic'),
)

const missingNotes = computed((): DraftChangeGroup[] =>
  semanticGroups.value.filter((group) => !(notesByGroup.value[group.key] ?? '').trim()),
)

const canRelease = computed(
  (): boolean =>
    !loading.value && !reviewLoading.value && !reviewError.value && missingNotes.value.length === 0,
)

// ---------------------------------------------------------------------------
// Unsaved-changes guard
// ---------------------------------------------------------------------------

const { confirmOpen, requestClose } = useUnsavedChangesGuard(() => meta.value.dirty)

function onOpenChange(open: boolean): void {
  if (!open && !requestClose()) return
  emit('update:open', open)
}

function onCancel(): void {
  if (requestClose()) emit('update:open', false)
}

function onConfirmDiscard(): void {
  confirmOpen.value = false
  emit('update:open', false)
}

watch(
  () => props.open,
  (val) => {
    if (val) {
      resetForm({ values: { version_string: '' } })
      notesByGroup.value = {}
      submitError.value = null
      void review.load()
    }
  },
  { immediate: true },
)

function setClassification(
  group: DraftChangeGroup,
  classification: DraftChangeClassification,
): void {
  void review.setGroupClassification(group, classification)
}

function textValue(content: Record<string, unknown> | null, key: string): string {
  const value = content?.[key]
  return typeof value === 'string' ? value : ''
}

function changeLabel(change: ModuleDraftChange): string {
  return change.change_type
}

function noteFor(group: DraftChangeGroup, value: string | number): void {
  notesByGroup.value = { ...notesByGroup.value, [group.key]: String(value) }
}

function classifyError(error: unknown): string {
  if (isApiError(error)) {
    if (error.type === 'conflict') {
      return error.message ?? 'The draft has changed since it was reviewed. Reload and try again.'
    }
    if (error.type === 'unknown') {
      const original = error.original as { message?: string } | undefined
      if (original?.message) return original.message
    }
    if ('message' in error && error.message) return error.message
  }
  return 'Failed to release this version.'
}

const onSubmit = handleSubmit(async (values) => {
  if (missingNotes.value.length > 0) return

  submitError.value = null

  const releaseNotes: ReleaseNote[] = semanticGroups.value.map((group) => ({
    entity_type: group.entityType,
    entity_id: group.entityId,
    note: (notesByGroup.value[group.key] ?? '').trim(),
  }))

  try {
    const result = await createVersion(props.systemId, props.moduleId, {
      version_string: values.version_string,
      notes: '',
      expected_draft_revision: draftRevision.value,
      release_notes: releaseNotes,
    })

    if (result.ok) {
      toast.success(`Released ${values.version_string}.`)
      emit('update:open', false)
      return
    }

    setErrors(result.errors)
  } catch (e) {
    submitError.value = classifyError(e)
    if (isApiError(e) && e.type === 'conflict') {
      await review.load()
    }
  }
})
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent class="overflow-y-auto max-h-[98dvh] sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Release Version</DialogTitle>
        <DialogDescription class="sr-only">
          Review pending draft changes and release a new version of {{ moduleName }}
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="space-y-1.5">
          <Label for="ver-string">Version</Label>
          <Input id="ver-string" v-model="versionString" placeholder="0.1" />
          <p v-if="errors.version_string" class="text-destructive text-xs">
            {{ errors.version_string }}
          </p>
        </div>

        <div class="space-y-3">
          <p class="text-xs uppercase tracking-widest text-muted-foreground">Pending changes</p>

          <div v-if="reviewLoading" class="text-sm text-muted-foreground">
            Loading pending draft changes…
          </div>

          <div v-else-if="reviewError" class="space-y-2">
            <p class="text-sm text-destructive">{{ reviewError }}</p>
            <Button type="button" variant="ghost" size="sm" @click="review.load()">
              Retry
            </Button>
          </div>

          <p v-else-if="groups.length === 0" class="text-sm text-muted-foreground">
            No pending draft changes.
          </p>

          <ul v-else class="space-y-3">
            <li
              v-for="group in groups"
              :key="group.key"
              class="rounded-md border border-border p-3 space-y-2"
              :data-group-key="group.key"
            >
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground break-words">{{ group.label }}</p>
                  <p class="text-xs text-muted-foreground">
                    {{ group.entityType }} ·
                    {{ group.changes.map(changeLabel).join(', ') }}
                  </p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    :class="{
                      'bg-muted text-foreground': group.classification === 'semantic',
                    }"
                    :aria-pressed="group.classification === 'semantic'"
                    @click="setClassification(group, 'semantic')"
                  >
                    Semantic
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    :class="{ 'bg-muted text-foreground': group.classification === 'typo' }"
                    :aria-pressed="group.classification === 'typo'"
                    @click="setClassification(group, 'typo')"
                  >
                    Typo
                  </Button>
                </div>
              </div>

              <div
                v-if="group.classification === 'semantic'"
                class="space-y-1.5"
                :data-note-group="group.key"
              >
                <Label :for="`note-${group.key}`">Release note (required)</Label>
                <Input
                  :id="`note-${group.key}`"
                  :model-value="notesByGroup[group.key] ?? ''"
                  :data-note-input="group.key"
                  placeholder="What changed?"
                  @update:model-value="noteFor(group, $event)"
                />
                <p
                  v-if="missingNotes.some((missing) => missing.key === group.key)"
                  class="text-destructive text-xs"
                >
                  A release note is required for semantic changes.
                </p>
              </div>

              <details class="text-xs text-muted-foreground">
                <summary class="cursor-pointer select-none">Show before/after</summary>
                <div class="mt-2 space-y-2">
                  <div
                    v-for="change in group.changes"
                    :key="change.id"
                    class="space-y-1"
                    :data-change-id="change.id"
                  >
                    <p class="font-medium text-foreground">
                      {{ change.change_type }}
                    </p>
                    <p
                      v-for="field in draftChangeTextFields(change)"
                      :key="field.key"
                      class="space-y-0.5"
                    >
                      <span class="font-mono text-[11px] uppercase">{{ field.key }}</span>
                      <span class="block line-through whitespace-pre-wrap break-words">
                        {{ textValue(change.content_before, field.key) }}
                      </span>
                      <span class="block whitespace-pre-wrap break-words">
                        {{ textValue(change.content_after, field.key) }}
                      </span>
                    </p>
                  </div>
                </div>
              </details>
            </li>
          </ul>
        </div>

        <p v-if="submitError" class="text-sm text-destructive">{{ submitError }}</p>

        <DialogFooter>
          <Button variant="ghost" type="button" @click="onCancel"> Cancel </Button>
          <Button type="submit" :disabled="!canRelease">
            {{ loading ? 'Releasing…' : 'Release' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <DiscardChangesDialog v-model:open="confirmOpen" @confirm="onConfirmDiscard" />
</template>
