<script setup lang="ts">
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { useSystemStore } from '@/stores/system'
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

useModalShortcutGuard(() => props.open)

const { defineField, handleSubmit, errors, setErrors, resetForm, meta } = useForm<FormValues>()

const [versionString] = defineField('version_string')

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
    }
  },
)

const onSubmit = handleSubmit(async (values) => {
  const result = await createVersion(props.systemId, props.moduleId, values.version_string)
  if (result.ok) {
    emit('update:open', false)
  } else {
    setErrors(result.errors)
  }
})
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Release Version</DialogTitle>
        <DialogDescription class="sr-only">
          Release a new version of {{ moduleName }}
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

        <DialogFooter>
          <Button variant="ghost" type="button" @click="onCancel"> Cancel </Button>
          <Button type="submit" :disabled="loading">Release</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <DiscardChangesDialog v-model:open="confirmOpen" @confirm="onConfirmDiscard" />
</template>
