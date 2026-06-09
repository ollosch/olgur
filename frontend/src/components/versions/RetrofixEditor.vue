<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { useRetrofix } from '@/composables/useRetrofix'
import { Button } from '@/components/ui/button'
import type { Rule } from '@/types/domain'

interface Props {
  systemId: string
  moduleId: string
  versionId: string
  /** Human-readable version string, e.g. "1.4" — displayed in the dual-editor header. */
  versionString: string
  /** The live draft rule being amended. */
  rule: Rule
  /** URL from `contentStore.manifestByModule[moduleId].files.rules` */
  manifestRulesUrl: string
}

const props = defineProps<Props>()

const {
  releasedContent,
  draftContent,
  isDiverged,
  isLoading,
  errors,
  loadReleasedContent,
  applyAmendment,
  applyDraftFix,
} = useRetrofix(props.systemId, props.moduleId, props.versionId, props.rule.id)

// ── Local state ──────────────────────────────────────────────────────────────

const changeType = ref<'correction' | 'update'>('correction')
const description = ref('')
const isSaving = ref(false)
const loadFailed = ref(false)

/** Snapshots captured once loading succeeds — used for change-detection. */
const initialReleasedContent = ref('')
const initialDraftContent = ref('')

// ── Computed helpers ─────────────────────────────────────────────────────────

/**
 * Writable computed that keeps both refs in sync while in single-editor mode.
 * Binding a single <textarea> to this ensures `applyAmendment` and
 * `applyDraftFix` both see the user's edits.
 */
const singleEditorContent = computed({
  get: () => releasedContent.value,
  set: (val: string) => {
    releasedContent.value = val
    draftContent.value = val
  },
})

const releasedChanged = computed(() => releasedContent.value !== initialReleasedContent.value)
const draftChanged = computed(() => draftContent.value !== initialDraftContent.value)
const descriptionValid = computed(() => description.value.trim().length > 0)

// ── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadReleasedContent(props.manifestRulesUrl)

  if (errors.value !== null) {
    loadFailed.value = true
  } else {
    initialReleasedContent.value = releasedContent.value
    initialDraftContent.value = draftContent.value
  }
})

// ── Save handlers ─────────────────────────────────────────────────────────────

async function handleSaveSingle(): Promise<void> {
  if (!descriptionValid.value || isSaving.value) return
  isSaving.value = true
  try {
    await applyAmendment(changeType.value, description.value)
    if (errors.value) return
    await applyDraftFix()
    if (!errors.value) {
      initialReleasedContent.value = releasedContent.value
      initialDraftContent.value = draftContent.value
    }
  } finally {
    isSaving.value = false
  }
}

async function handleSaveAmendment(): Promise<void> {
  if (!releasedChanged.value || !descriptionValid.value || isSaving.value) return
  isSaving.value = true
  try {
    await applyAmendment(changeType.value, description.value)
    if (!errors.value) initialReleasedContent.value = releasedContent.value
  } finally {
    isSaving.value = false
  }
}

async function handleSaveDraft(): Promise<void> {
  if (!draftChanged.value || isSaving.value) return
  isSaving.value = true
  try {
    await applyDraftFix()
    if (!errors.value) initialDraftContent.value = draftContent.value
  } finally {
    isSaving.value = false
  }
}

async function handleSaveBoth(): Promise<void> {
  if ((!releasedChanged.value && !draftChanged.value) || !descriptionValid.value || isSaving.value)
    return
  isSaving.value = true
  try {
    await applyAmendment(changeType.value, description.value)
    if (errors.value) return
    await applyDraftFix()
    if (!errors.value) {
      initialReleasedContent.value = releasedContent.value
      initialDraftContent.value = draftContent.value
    }
  } finally {
    isSaving.value = false
  }
}

const textareaClass =
  'border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <!-- Loading state -->
  <div v-if="isLoading" class="flex items-center justify-center py-8">
    <div class="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
  </div>

  <!-- Load error -->
  <div
    v-else-if="loadFailed"
    class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
  >
    {{ errors?.['load'] ?? 'Failed to load released version content.' }}
  </div>

  <!-- Editor -->
  <div v-else class="space-y-4">
    <!-- ── Single editor (not diverged) ─────────────────────────────────── -->
    <template v-if="!isDiverged">
      <div
        class="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300"
      >
        Released version and current draft are identical. Saving will update both.
      </div>

      <textarea v-model="singleEditorContent" rows="8" :class="textareaClass" />
    </template>

    <!-- ── Dual editor (diverged) ────────────────────────────────────────── -->
    <template v-else>
      <div class="grid grid-cols-2 gap-4">
        <!-- Released version (left) -->
        <div class="space-y-2">
          <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Released version ({{ versionString }})
          </div>
          <textarea v-model="releasedContent" rows="10" :class="textareaClass" />
        </div>

        <!-- Current draft (right) -->
        <div class="space-y-2">
          <div class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Current draft
          </div>
          <textarea v-model="draftContent" rows="10" :class="textareaClass" />
        </div>
      </div>
    </template>

    <!-- ── Shared fields ──────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-foreground" for="retrofix-change-type">
          Change type
        </label>
        <select
          id="retrofix-change-type"
          v-model="changeType"
          class="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        >
          <option value="correction">Correction</option>
          <option value="update">Update</option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-foreground" for="retrofix-description">
          Description <span class="text-destructive">*</span>
        </label>
        <input
          id="retrofix-description"
          v-model="description"
          type="text"
          placeholder="Describe the change…"
          class="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>

    <!-- API errors -->
    <div
      v-if="errors !== null && !loadFailed"
      class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <div v-for="(msg, key) in errors" :key="String(key)">{{ msg }}</div>
    </div>

    <!-- ── Action buttons ─────────────────────────────────────────────────── -->
    <template v-if="!isDiverged">
      <Button :disabled="!descriptionValid || isSaving" @click="handleSaveSingle">Save</Button>
    </template>

    <template v-else>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          :disabled="!releasedChanged || !descriptionValid || isSaving"
          @click="handleSaveAmendment"
        >
          Apply to released version
        </Button>

        <Button variant="outline" :disabled="!draftChanged || isSaving" @click="handleSaveDraft">
          Apply to draft
        </Button>

        <Button
          :disabled="(!releasedChanged && !draftChanged) || !descriptionValid || isSaving"
          @click="handleSaveBoth"
        >
          Apply to both
        </Button>
      </div>
    </template>
  </div>
</template>
