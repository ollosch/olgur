<script setup lang="ts">
import { computed } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useContentStore } from '@/stores/content'
import type { Rule } from '@/types/domain'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'
import RetrofixEditor from '@/components/versions/RetrofixEditor.vue'

interface Props {
  rule: Rule
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const systemStore = useSystemStore()
const contentStore = useContentStore()

useModalShortcutGuard(() => props.open)

const systemId = computed(() => systemStore.currentSystem?.id ?? '')
const moduleId = computed(() => props.rule.module_id)
const manifestEntry = computed(() => contentStore.manifestByModule[moduleId.value])
const versionId = computed(() => manifestEntry.value?.version_id ?? '')
const versionString = computed(() => manifestEntry.value?.version_string ?? '')
const manifestRulesUrl = computed(() => manifestEntry.value?.content?.rules ?? '')
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="overflow-y-auto max-h-[98dvh] sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Back-edit released version</DialogTitle>
        <DialogDescription class="sr-only"
          >Amend the latest released version of this rule</DialogDescription
        >
      </DialogHeader>

      <RetrofixEditor
        :system-id="systemId"
        :module-id="moduleId"
        :version-id="versionId"
        :version-string="versionString"
        :rule="props.rule"
        :manifest-rules-url="manifestRulesUrl"
      />
    </DialogContent>
  </Dialog>
</template>
