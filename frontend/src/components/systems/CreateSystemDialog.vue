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
import { generateSlug } from '@/lib/utils'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'

interface Props {
  open: boolean
}

interface FormValues {
  name: string
  slug: string
  description: string
  global_rule_numbers: boolean
  toc_depth: number
  sort_rules_by: 'number' | 'sort_order'
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const systemStore = useSystemStore()
const { loading } = storeToRefs(systemStore)
const { createSystem } = systemStore

useModalShortcutGuard(() => props.open)

const { defineField, handleSubmit, errors, setErrors, resetForm } = useForm<FormValues>()

const [name] = defineField('name')
const [slug] = defineField('slug')
const [description] = defineField('description')
const [globalRuleNumbers] = defineField('global_rule_numbers')
const [tocDepth] = defineField('toc_depth')
const [sortRulesBy] = defineField('sort_rules_by')

watch(name, (val) => {
  slug.value = generateSlug(val ?? '')
})

watch(
  () => props.open,
  (val) => {
    if (val) {
      resetForm({
        values: {
          name: '',
          slug: '',
          description: '',
          global_rule_numbers: false,
          toc_depth: 1,
          sort_rules_by: 'sort_order',
        },
      })
    }
  },
)

const onSubmit = handleSubmit(async (values) => {
  const result = await createSystem({
    name: values.name,
    slug: values.slug,
    description: values.description,
    config: {
      global_rule_numbers: values.global_rule_numbers,
      toc_depth: values.toc_depth,
      sort_rules_by: values.sort_rules_by,
    },
  })
  if (result.ok) {
    emit('update:open', false)
  } else {
    setErrors(result.errors)
  }
})

function formError(key: string): string | undefined {
  return (errors.value as Record<string, string | undefined>)[key]
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>New System</DialogTitle>
        <DialogDescription class="sr-only">Create a new rulebook system</DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="space-y-1.5">
          <Label for="sys-name">Name</Label>
          <Input id="sys-name" v-model="name" placeholder="My Rulebook System" />
          <p v-if="errors.name" class="text-destructive text-xs">
            {{ errors.name }}
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="sys-slug">Slug</Label>
          <Input id="sys-slug" v-model="slug" placeholder="my-rulebook-system" />
          <p v-if="errors.slug" class="text-destructive text-xs">
            {{ errors.slug }}
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="sys-description">Description</Label>
          <Input
            id="sys-description"
            v-model="description"
            placeholder="A short description (optional)"
          />
          <p v-if="errors.description" class="text-destructive text-xs">
            {{ errors.description }}
          </p>
        </div>

        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <input
              id="sys-global-rule-numbers"
              v-model="globalRuleNumbers"
              type="checkbox"
              class="rounded border-border bg-background text-primary focus:ring-ring"
            />
            <Label for="sys-global-rule-numbers">Global rule numbers</Label>
          </div>
          <p v-if="formError('config.global_rule_numbers')" class="text-destructive text-xs">
            {{ formError('config.global_rule_numbers') }}
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="sys-sort-rules-by">Sort Rules By</Label>
          <select
            id="sys-sort-rules-by"
            v-model="sortRulesBy"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="sort_order">Manual order</option>
            <option value="number">Rule number</option>
          </select>
          <p v-if="formError('config.sort_rules_by')" class="text-destructive text-xs">
            {{ formError('config.sort_rules_by') }}
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="sys-toc-depth">Table of Contents Depth</Label>
          <Input
            id="sys-toc-depth"
            v-model.number="tocDepth"
            type="number"
            min="1"
            placeholder="1"
          />
          <p v-if="formError('config.toc_depth')" class="text-destructive text-xs">
            {{ formError('config.toc_depth') }}
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" type="button" @click="emit('update:open', false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="loading">Create</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
