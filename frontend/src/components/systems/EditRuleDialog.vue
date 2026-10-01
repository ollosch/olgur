<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { renderContent } from '@/lib/renderContent'
import type { Rule } from '@/types/domain'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { useUnsavedChangesGuard } from '@/composables/useUnsavedChangesGuard'
import DiscardChangesDialog from '@/components/DiscardChangesDialog.vue'
import RuleSearchInput from './RuleSearchInput.vue'

interface Props {
  open: boolean
  rule: Rule
}

interface FormValues {
  number: string
  title: string
  content: string
  markdown: string
  parent_id: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const systemStore = useSystemStore()
const contentStore = useContentStore()
const { loading } = storeToRefs(contentStore)

useModalShortcutGuard(() => props.open)

const { defineField, handleSubmit, errors, setErrors, setFieldValue, resetForm, meta } =
  useForm<FormValues>()

const [ruleNumber, ruleNumberAttrs] = defineField('number')
const [title, titleAttrs] = defineField('title')
const [content, contentAttrs] = defineField('content')
const [markdown, markdownAttrs] = defineField('markdown')
const [parentId] = defineField('parent_id')

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

// ---------------------------------------------------------------------------
// Descendant exclusion set
// ---------------------------------------------------------------------------

function collectDescendantIds(ruleId: string): Set<string> {
  const result = new Set<string>()
  const queue = [ruleId]
  while (queue.length > 0) {
    const current = queue.shift()!
    result.add(current)
    const children = contentStore.childrenMap.get(current) ?? []
    for (const child of children) {
      queue.push(child.id)
    }
  }
  return result
}

const excludedIds = computed(() => collectDescendantIds(props.rule.id))

// ---------------------------------------------------------------------------
// Parent selection
// ---------------------------------------------------------------------------

const selectedParent = computed((): Rule | null => {
  if (!parentId.value) return null
  return contentStore.rulesById.get(parentId.value) ?? null
})

function selectParent(rule: Rule): void {
  setFieldValue('parent_id', rule.id)
}

function clearParent(): void {
  setFieldValue('parent_id', null)
}

// ---------------------------------------------------------------------------
// Reset on open
// ---------------------------------------------------------------------------

watch(
  () => props.open,
  (val) => {
    if (val) {
      resetForm({
        values: {
          number: props.rule.number,
          title: props.rule.title,
          content: props.rule.content.replaceAll('<br>', '\n'),
          markdown: props.rule.markdown ?? '',
          parent_id: props.rule.parent_id,
        },
      })
    }
  },
  { immediate: true },
)

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

const onSubmit = handleSubmit(async (values) => {
  const result = await contentStore.updateRule(systemStore.currentSystem?.id ?? '', props.rule, {
    number: values.number,
    title: values.title,
    content: values.content,
    markdown: values.markdown,
    parent_id: values.parent_id ?? null,
    sort_order: props.rule.sort_order,
  })

  if (!result.ok) {
    setErrors(result.errors as Partial<Record<keyof FormValues, string>>)
    return
  }

  emit('update:open', false)
})
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent class="overflow-y-auto max-h-[98dvh] sm:max-h-[95dvh]">
      <DialogHeader>
        <DialogTitle>Edit Rule</DialogTitle>
        <DialogDescription class="sr-only"
          >Edit the rule number, title, content and parent</DialogDescription
        >
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <FieldGroup>
          <Field>
            <FieldLabel for="rule-number">Number</FieldLabel>
            <Input
              id="rule-number"
              v-model="ruleNumber"
              v-bind="ruleNumberAttrs"
              placeholder="A.1.2"
            />
            <div v-if="errors.number" class="text-destructive text-sm">{{ errors.number }}</div>
          </Field>

          <Field>
            <FieldLabel for="rule-title">Title</FieldLabel>
            <Input id="rule-title" v-model="title" v-bind="titleAttrs" placeholder="Rule title" />
            <div v-if="errors.title" class="text-destructive text-sm">{{ errors.title }}</div>
          </Field>

          <Field>
            <FieldLabel>Parent</FieldLabel>

            <!-- Selected parent display -->
            <div
              v-if="selectedParent"
              class="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm"
            >
              <span class="font-mono text-primary">{{ selectedParent.number }}</span>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span
                class="text-foreground/80 min-w-0 truncate"
                :data-rule-context="selectedParent.module_id"
                v-html="renderContent(selectedParent.title)"
              />
              <button
                type="button"
                class="ml-auto text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Clear parent"
                @click="clearParent"
              >
                ✕
              </button>
            </div>

            <!-- Search input + floating dropdown -->
            <RuleSearchInput
              v-else
              :module-id="props.rule.module_id"
              :excluded-ids="excludedIds"
              @select="selectParent"
            />

            <div v-if="errors.parent_id" class="text-destructive text-sm">
              {{ errors.parent_id }}
            </div>
            <p class="text-muted-foreground text-xs">
              Note: changing the parent does not automatically update the rule number.
            </p>
          </Field>

          <Field>
            <FieldLabel for="rule-content">Content</FieldLabel>
            <Textarea
              id="rule-content"
              v-model="content"
              v-bind="contentAttrs"
              rows="6"
              placeholder="Rule content…"
              class="min-h-[80px]"
            />
            <div v-if="errors.content" class="text-destructive text-sm">{{ errors.content }}</div>
          </Field>

          <Field>
            <FieldLabel for="rule-markdown">Markdown</FieldLabel>
            <Textarea
              id="rule-markdown"
              v-model="markdown"
              v-bind="markdownAttrs"
              rows="6"
              placeholder="Rule markdown…"
              class="min-h-[80px]"
            />
            <div v-if="errors.markdown" class="text-destructive text-sm">{{ errors.markdown }}</div>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="ghost" type="button" @click="onCancel"> Cancel </Button>
          <Button type="submit" :disabled="loading">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <DiscardChangesDialog v-model:open="confirmOpen" @confirm="onConfirmDiscard" />
</template>
