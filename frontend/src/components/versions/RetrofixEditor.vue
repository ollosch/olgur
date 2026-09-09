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
  /** URL from `contentStore.manifestByModule[moduleId].content.rules` */
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

const isSaving = ref(false)
const loadFailed = ref(false)
const portToDraft = ref(false)

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

/**
 * Applies the back-edit to the released snapshot. When the released and draft
 * fields matched before the amendment and the editor opted in, the same
 * correction is explicitly ported to the live draft.
 */
async function handleSaveSingle(): Promise<void> {
  if (!releasedChanged.value || isSaving.value) return
  isSaving.value = true
  try {
    await applyAmendment()
    if (errors.value) return
    if (portToDraft.value) {
      await applyDraftFix()
    }
    if (!errors.value) {
      initialReleasedContent.value = releasedContent.value
      initialDraftContent.value = draftContent.value
    }
  } finally {
    isSaving.value = false
  }
}

async function handleSaveAmendment(): Promise<void> {
  if (!releasedChanged.value || isSaving.value) return
  isSaving.value = true
  try {
    await applyAmendment()
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
        Released version and current draft are identical.
      </div>

      <textarea v-model="singleEditorContent" rows="8" :class="textareaClass" />

      <label class="flex items-center gap-2 text-sm text-foreground">
        <input v-model="portToDraft" type="checkbox" class="h-4 w-4" />
        Also apply this correction to the current draft
      </label>
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

    <!-- API errors -->
    <div
      v-if="errors !== null && !loadFailed"
      class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <div v-for="(msg, key) in errors" :key="String(key)">{{ msg }}</div>
    </div>

    <!-- ── Action buttons ─────────────────────────────────────────────────── -->
    <template v-if="!isDiverged">
      <Button :disabled="!releasedChanged || isSaving" @click="handleSaveSingle">Save</Button>
    </template>

    <template v-else>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          :disabled="!releasedChanged || isSaving"
          @click="handleSaveAmendment"
        >
          Apply to released version
        </Button>

        <Button variant="outline" :disabled="!draftChanged || isSaving" @click="handleSaveDraft">
          Apply to draft
        </Button>
      </div>
    </template>
  </div>
</template>
