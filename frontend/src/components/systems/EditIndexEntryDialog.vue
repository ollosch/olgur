<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useForm } from 'vee-validate'
import { useContentStore } from '@/stores/content'
import type { IndexEntry, Rule } from '@/types/domain'

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
import {
  TagsInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from '@/components/ui/tags-input'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'
import IndexEntrySearchInput from './IndexEntrySearchInput.vue'
import RuleSearchInput from './RuleSearchInput.vue'

interface Props {
  open: boolean
  entry: IndexEntry
}

interface FormValues {
  term: string
  definition: string
  notes: string
  parent_id: string | null
  rule_refs: string[]
  see_also: string[]
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

const [term, termAttrs] = defineField('term')
const [definition, definitionAttrs] = defineField('definition')
const [notes, notesAttrs] = defineField('notes')
const [parentId] = defineField('parent_id')
const [ruleRefs] = defineField('rule_refs')
const [seeAlso] = defineField('see_also')

// ---------------------------------------------------------------------------
// Descendant exclusion for parent selector
// ---------------------------------------------------------------------------

function collectDescendantIds(entryId: string): Set<string> {
  const result = new Set<string>()
  const queue = [entryId]
  while (queue.length > 0) {
    const current = queue.shift()!
    result.add(current)
    const children = contentStore.indexEntriesByParent.get(current) ?? []
    for (const child of children) {
      queue.push(child.id)
    }
  }
  return result
}

const excludedParentIds = computed(() => collectDescendantIds(props.entry.id))

// ---------------------------------------------------------------------------
// Parent selection
// ---------------------------------------------------------------------------

const selectedParent = computed((): IndexEntry | null => {
  if (!parentId.value) return null
  return contentStore.indexEntriesById.get(parentId.value) ?? null
})

function selectParent(entry: IndexEntry): void {
  setFieldValue('parent_id', entry.id)
}

function clearParent(): void {
  setFieldValue('parent_id', null)
}

// ---------------------------------------------------------------------------
// rule_refs multi-chip
// ---------------------------------------------------------------------------

const excludedRuleNumbers = computed(() => new Set(ruleRefs.value ?? []))

function addRuleRef(rule: Rule): void {
  const current = ruleRefs.value ?? []
  if (!current.includes(rule.number)) {
    setFieldValue('rule_refs', [...current, rule.number])
  }
}

// ---------------------------------------------------------------------------
// see_also multi-chip
// ---------------------------------------------------------------------------

const excludedSeeAlsoIds = computed(() => new Set([props.entry.id]))
const excludedSeeAlsoTerms = computed(() => new Set(seeAlso.value ?? []))

function addSeeAlso(entry: IndexEntry): void {
  const current = seeAlso.value ?? []
  if (!current.includes(entry.term)) {
    setFieldValue('see_also', [...current, entry.term])
  }
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
          term: props.entry.term,
          definition: props.entry.definition,
          notes: props.entry.notes ?? '',
          parent_id: props.entry.parent_id,
          rule_refs: props.entry.relations?.rule_refs ?? [],
          see_also: props.entry.relations?.see_also ?? [],
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
  const updated = await contentStore.updateIndexEntry(props.entry, {
    term: values.term,
    definition: values.definition,
    notes: values.notes,
    parent_id: values.parent_id ?? null,
      relations: {
        rule_refs: values.rule_refs ?? [],
        see_also: values.see_also ?? [],
      },
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
    <DialogContent class="overflow-y-auto max-h-[calc(90dvh-12rem)] sm:max-h-[95dvh]">
      <DialogHeader>
        <DialogTitle>Edit Index Entry</DialogTitle>
        <DialogDescription class="sr-only">Edit the term, parent, definition, notes, rule references and see also links
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <FieldGroup class="">
          <!-- Term -->
          <Field>
            <FieldLabel for="entry-term">Term</FieldLabel>
            <Input id="entry-term" v-model="term" v-bind="termAttrs" placeholder="Term" />
            <div v-if="errors.term" class="text-destructive text-sm">{{ errors.term }}</div>
          </Field>

          <!-- Parent -->
          <Field>
            <FieldLabel>Parent</FieldLabel>

            <!-- Selected parent display -->
            <div v-if="selectedParent"
              class="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
              <span class="text-foreground/80 min-w-0 truncate">{{ selectedParent.term }}</span>
              <button type="button"
                class="ml-auto text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Clear parent" @click="clearParent">
                ✕
              </button>
            </div>

            <!-- Search input + floating dropdown -->
            <IndexEntrySearchInput v-else :module-id="props.entry.module_id" :excluded-ids="excludedParentIds"
              :root-only="true" @select="selectParent" />

            <div v-if="errors.parent_id" class="text-destructive text-sm">{{ errors.parent_id }}</div>
          </Field>

          <!-- Rule refs -->
          <Field>
            <FieldLabel>Rule References</FieldLabel>

            <!-- Chips -->
            <TagsInput v-if="(ruleRefs ?? []).length" :model-value="ruleRefs ?? []" :add-on-keys="[]"
              @update:model-value="setFieldValue('rule_refs', $event as string[])">
              <TagsInputItem v-for="ref in (ruleRefs ?? [])" :key="ref" :value="ref"
                class="h-auto rounded bg-muted px-2 py-0.5 font-mono text-xs text-primary">
                <TagsInputItemText />
                <TagsInputItemDelete />
              </TagsInputItem>
            </TagsInput>

            <!-- Search input + floating dropdown -->
            <RuleSearchInput :module-id="props.entry.module_id" :excluded-numbers="excludedRuleNumbers"
              @select="addRuleRef" />

            <div v-if="errors.rule_refs" class="text-destructive text-sm">{{ errors.rule_refs }}</div>
          </Field>

          <!-- See also -->
          <Field>
            <FieldLabel>See Also</FieldLabel>

            <!-- Chips -->
            <TagsInput v-if="(seeAlso ?? []).length" :model-value="seeAlso ?? []" :add-on-keys="[]"
              @update:model-value="setFieldValue('see_also', $event as string[])">
              <TagsInputItem v-for="t in (seeAlso ?? [])" :key="t" :value="t"
                class="h-auto rounded bg-muted px-2 py-0.5 text-xs italic text-foreground/80">
                <TagsInputItemText />
                <TagsInputItemDelete />
              </TagsInputItem>
            </TagsInput>

            <!-- Search input + floating dropdown -->
            <IndexEntrySearchInput :module-id="props.entry.module_id" :excluded-ids="excludedSeeAlsoIds"
              :excluded-terms="excludedSeeAlsoTerms" :root-only="true" @select="addSeeAlso" />

            <div v-if="errors.see_also" class="text-destructive text-sm">{{ errors.see_also }}</div>
          </Field>

          <!-- Definition -->
          <Field>
            <FieldLabel for="entry-definition">Definition</FieldLabel>
            <textarea id="entry-definition" v-model="definition" v-bind="definitionAttrs" rows="4"
              placeholder="Definition…"
              class="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50" />
            <div v-if="errors.definition" class="text-destructive text-sm">{{ errors.definition }}</div>
          </Field>

          <!-- Notes -->
          <Field>
            <FieldLabel for="entry-notes">Notes</FieldLabel>
            <textarea id="entry-notes" v-model="notes" v-bind="notesAttrs" rows="3" placeholder="Notes…"
              class="border-input bg-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50" />
            <div v-if="errors.notes" class="text-destructive text-sm">{{ errors.notes }}</div>
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
