<script setup lang="ts">
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import type { RenumberPreview, Rule } from '@/types/domain'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'

interface Props {
  open: boolean
  rule: Rule
}

interface FormValues {
  number: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const systemStore = useSystemStore()
const contentStore = useContentStore()
const { loading } = storeToRefs(contentStore)

useModalShortcutGuard(() => props.open)

const { defineField, handleSubmit, errors, setErrors, resetForm } = useForm<FormValues>()
const [number, numberAttrs] = defineField('number')

const preview = ref<RenumberPreview | null>(null)

watch(
  () => props.open,
  (open) => {
    if (open) {
      preview.value = null
      resetForm({ values: { number: props.rule.number } })
    }
  },
)

const onSubmit = handleSubmit(async (values) => {
  const result = await contentStore.previewRenumber(
    systemStore.currentSystem?.id ?? '',
    props.rule,
    values.number,
  )

  if (!result.ok) {
    setErrors(result.errors as Partial<Record<keyof FormValues, string>>)
    return
  }

  preview.value = result.data
})

async function confirm(): Promise<void> {
  const target = preview.value?.rule.new_number ?? number.value

  const result = await contentStore.confirmRenumber(
    systemStore.currentSystem?.id ?? '',
    props.rule,
    target,
  )

  if (!result.ok) {
    setErrors(result.errors as Partial<Record<keyof FormValues, string>>)
    return
  }

  preview.value = null
  emit('update:open', false)
}

function back(): void {
  preview.value = null
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Renumber Rule</DialogTitle>
        <DialogDescription class="sr-only">
          Preview and confirm the references affected by changing a rule's number
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <!-- Stage 1: pick a new number and preview -->
        <template v-if="!preview">
          <FieldGroup>
            <Field>
              <FieldLabel for="renumber-number">New number</FieldLabel>
              <Input
                id="renumber-number"
                v-model="number"
                v-bind="numberAttrs"
                placeholder="A.1.2"
              />
              <div v-if="errors.number" class="text-destructive text-sm">{{ errors.number }}</div>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button variant="ghost" type="button" @click="emit('update:open', false)">
              Cancel
            </Button>
            <Button type="submit" :disabled="loading">Preview</Button>
          </DialogFooter>
        </template>

        <!-- Stage 2: show preview and confirm -->
        <template v-else>
          <p class="text-sm">
            Renumbering
            <span class="font-mono text-primary">{{ preview.rule.number }}</span>
            &rarr;
            <span class="font-mono text-primary">{{ preview.rule.new_number }}</span>
          </p>

          <div v-if="preview.affected_rules.length > 0" class="space-y-1">
            <p class="text-xs uppercase tracking-widest text-muted-foreground">
              Affected rules ({{ preview.affected_rules.length }})
            </p>
            <ul class="space-y-1">
              <li
                v-for="affected in preview.affected_rules"
                :key="affected.id"
                class="flex items-baseline gap-2 text-sm"
              >
                <span class="font-mono text-primary text-xs">{{ affected.number }}</span>
                <span class="text-foreground/80 truncate">{{ affected.title }}</span>
              </li>
            </ul>
          </div>

          <div v-if="preview.affected_index_entries.length > 0" class="space-y-1">
            <p class="text-xs uppercase tracking-widest text-muted-foreground">
              Affected index entries ({{ preview.affected_index_entries.length }})
            </p>
            <ul class="space-y-1">
              <li
                v-for="entry in preview.affected_index_entries"
                :key="entry.id"
                class="text-sm text-foreground/80"
              >
                {{ entry.term }}
              </li>
            </ul>
          </div>

          <p
            v-if="
              preview.affected_rules.length === 0 && preview.affected_index_entries.length === 0
            "
            class="text-sm text-muted-foreground"
          >
            No other references will be affected.
          </p>

          <DialogFooter>
            <Button variant="ghost" type="button" @click="back">Back</Button>
            <Button type="button" :disabled="loading" @click="confirm">Confirm renumber</Button>
          </DialogFooter>
        </template>
      </form>
    </DialogContent>
  </Dialog>
</template>
