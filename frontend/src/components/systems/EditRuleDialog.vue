<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { useContentStore } from '@/stores/content'
import type { Rule } from '@/types/domain'

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
  title: string
  content: string
  parent_search: string
  parent_id: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const contentStore = useContentStore()
const { loading, errors: apiErrors } = storeToRefs(contentStore)

useModalShortcutGuard(() => props.open)

const { defineField, handleSubmit, errors, setErrors, setFieldValue, resetForm } =
  useForm<FormValues>()

const [ruleNumber, ruleNumberAttrs] = defineField('number')
const [title, titleAttrs] = defineField('title')
const [content, contentAttrs] = defineField('content')
const [parentSearch, parentSearchAttrs] = defineField('parent_search')
const [parentId] = defineField('parent_id')

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

// ---------------------------------------------------------------------------
// Parent search results
// ---------------------------------------------------------------------------

const excludedIds = computed(() => collectDescendantIds(props.rule.id))

const parentSearchResults = computed((): Rule[] => {
  const query = (parentSearch.value ?? '').trim().toLowerCase()
  const moduleRules = contentStore.rulesByModule[props.rule.module_id] ?? []

  const eligible = moduleRules.filter((r) => !excludedIds.value.has(r.id))

  if (!query) return eligible

  const exactNumber: Rule[] = []
  const partialNumber: Rule[] = []
  const titleOnly: Rule[] = []

  for (const r of eligible) {
    const num = r.number.toLowerCase()
    const titleMatch = r.title.toLowerCase().includes(query)
    if (num === query) {
      exactNumber.push(r)
    } else if (num.includes(query)) {
      partialNumber.push(r)
    } else if (titleMatch) {
      titleOnly.push(r)
    }
  }

  return [...exactNumber, ...partialNumber, ...titleOnly]
})

const selectedParent = computed((): Rule | null => {
  if (!parentId.value) return null
  return contentStore.rulesById.get(parentId.value) ?? null
})

function selectParent(rule: Rule): void {
  setFieldValue('parent_id', rule.id)
  setFieldValue('parent_search', rule.number)
}

function clearParent(): void {
  setFieldValue('parent_id', null)
  setFieldValue('parent_search', '')
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
          parent_search: props.rule.parent_id
            ? (contentStore.rulesById.get(props.rule.parent_id)?.number ?? '')
            : '',
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
  const updated = await contentStore.updateRule(props.rule, {
    number: values.number,
    title: values.title,
    content: values.content.replaceAll('\n', '<br>'),
    parent_id: values.parent_id ?? null,
    sort_order: props.rule.sort_order,
  })

  if (apiErrors.value) {
    setErrors(apiErrors.value as Partial<Record<keyof FormValues, string>>)
    return
  }

  if (updated) {
    emit('update:open', false)
  }
})
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit Rule</DialogTitle>
        <DialogDescription class="sr-only">Edit the rule number, title, content and parent</DialogDescription>
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
            <Input
              id="rule-title"
              v-model="title"
              v-bind="titleAttrs"
              placeholder="Rule title"
            />
            <div v-if="errors.title" class="text-destructive text-sm">{{ errors.title }}</div>
          </Field>

          <Field>
            <FieldLabel for="rule-content">Content</FieldLabel>
            <textarea
              id="rule-content"
              v-model="content"
              v-bind="contentAttrs"
              rows="6"
              placeholder="Rule content…"
              class="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div v-if="errors.content" class="text-destructive text-sm">{{ errors.content }}</div>
          </Field>

          <Field>
            <FieldLabel for="rule-parent-search">Parent</FieldLabel>

            <!-- Selected parent display -->
            <div v-if="selectedParent" class="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
              <span class="font-mono text-primary">{{ selectedParent.number }}</span>
              <span class="text-foreground/80 min-w-0 truncate">{{ selectedParent.title }}</span>
              <button
                type="button"
                class="ml-auto text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Clear parent"
                @click="clearParent"
              >
                ✕
              </button>
            </div>

            <!-- Search input -->
            <Input
              v-else
              id="rule-parent-search"
              v-model="parentSearch"
              v-bind="parentSearchAttrs"
              placeholder="Search by rule number or title…"
              autocomplete="off"
            />

            <!-- Search results dropdown -->
            <div
              v-if="!selectedParent && parentSearch"
              class="border border-border rounded-md bg-popover shadow-md max-h-48 overflow-y-auto"
            >
              <div v-if="parentSearchResults.length === 0" class="px-3 py-2 text-sm text-muted-foreground">
                No matching rules
              </div>
              <button
                v-for="result in parentSearchResults"
                :key="result.id"
                type="button"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                @click="selectParent(result)"
              >
                <span class="font-mono text-primary shrink-0">{{ result.number }}</span>
                <span class="text-foreground/80 min-w-0 truncate">{{ result.title }}</span>
              </button>
            </div>

            <div v-if="errors.parent_id" class="text-destructive text-sm">{{ errors.parent_id }}</div>
            <p class="text-muted-foreground text-xs">
              Note: changing the parent does not automatically update the rule number.
            </p>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="ghost" type="button" @click="emit('update:open', false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="loading">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
