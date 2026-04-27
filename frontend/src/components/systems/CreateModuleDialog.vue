<script setup lang="ts">
import { ref, watch } from 'vue'
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
  systemId: string
  open: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const systemStore = useSystemStore()
const { modulesBySystem, errors, loading } = storeToRefs(systemStore)
const { createModule } = systemStore

const name = ref('')
const slug = ref('')
const isCore = ref(false)

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
      isCore.value = false
    }
  },
)

async function submit() {
  const existingCount = modulesBySystem.value[props.systemId]?.length ?? 0
  const result = await createModule(props.systemId, {
    name: name.value,
    slug: slug.value,
    is_core: isCore.value,
    description: '',
    config: {},
    sort_order: existingCount,
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
        <DialogTitle>New Module</DialogTitle>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="submit">
        <div class="space-y-1.5">
          <Label for="mod-name">Name</Label>
          <Input id="mod-name" v-model="name" placeholder="Core Rules" />
          <p v-if="errors?.name" class="text-destructive text-xs">
            {{ errors.name }}
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="mod-slug">Slug</Label>
          <Input id="mod-slug" v-model="slug" placeholder="core-rules" />
          <p v-if="errors?.slug" class="text-destructive text-xs">
            {{ errors.slug }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <input
            id="mod-core"
            v-model="isCore"
            type="checkbox"
            class="rounded border-border bg-background text-primary focus:ring-ring"
          />
          <Label for="mod-core">Core module</Label>
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
