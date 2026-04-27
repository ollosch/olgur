<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SystemStructure } from '@/types/domain'
import { storeToRefs } from 'pinia'
import { useSystemStore } from '@/stores/system'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const systemStore = useSystemStore()
const { errors, loading } = storeToRefs(systemStore)
const { createSystem } = systemStore

const name = ref('')
const slug = ref('')
const description = ref('')
const structure = ref<SystemStructure>('core_plus_many')
const tocDepth = ref(1)
const sortRulesBy = ref<'number' | 'sort_order'>('sort_order')

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

watch(name, (val) => {
  slug.value = generateSlug(val)
})

watch(
  () => props.open,
  (val) => {
    if (val) {
      name.value = ''
      slug.value = ''
      description.value = ''
      structure.value = 'core_plus_many'
      tocDepth.value = 1
      sortRulesBy.value = 'sort_order'
    }
  },
)

async function submit() {
  const result = await createSystem({
    name: name.value,
    slug: slug.value,
    description: description.value,
    config: {
      system_structure: structure.value,
      toc_depth: tocDepth.value,
      sort_rules_by: sortRulesBy.value,
    },
  })
  if (result) {
    emit('update:open', false)
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>New System</DialogTitle>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label for="sys-name">Name</Label>
          <Input id="sys-name" v-model="name" placeholder="My Rulebook System" />
          <p v-if="errors?.name" class="text-destructive text-xs">
            {{ errors.name }}
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="sys-slug">Slug</Label>
          <Input id="sys-slug" v-model="slug" placeholder="my-rulebook-system" />
          <p v-if="errors?.slug" class="text-destructive text-xs">
            {{ errors.slug }}
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="sys-description">Description</Label>
          <Input id="sys-description" v-model="description" placeholder="A short description (optional)" />
          <p v-if="errors?.description" class="text-destructive text-xs">
            {{ errors.description }}
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="sys-structure">Structure</Label>
          <select
            id="sys-structure"
            v-model="structure"
            class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="core_plus_many">Core + Many (ASL-style)</option>
            <option value="core_plus_one">Core + One (BCS-style)</option>
            <option value="grouping_only">Grouping Only (ZOC-style)</option>
          </select>
          <p
            v-if="errors?.['config.system_structure']"
            class="text-destructive text-xs"
          >
            {{ errors['config.system_structure'] }}
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
          <p
            v-if="errors?.['config.sort_rules_by']"
            class="text-destructive text-xs"
          >
            {{ errors['config.sort_rules_by'] }}
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
          <p v-if="errors?.['config.toc_depth']" class="text-destructive text-xs">
            {{ errors['config.toc_depth'] }}
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
