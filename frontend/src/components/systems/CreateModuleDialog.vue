<script setup lang="ts">
import { computed, watch } from 'vue'
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
  systemId: string
  open: boolean
  hasCoreModule?: boolean
}

interface FormValues {
  name: string
  slug: string
  is_core: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const showCoreCheckbox = computed(() => !props.hasCoreModule)

const systemStore = useSystemStore()
const { modulesBySystem, loading } = storeToRefs(systemStore)
const { createModule } = systemStore

useModalShortcutGuard(() => props.open)

const { defineField, handleSubmit, errors, setErrors, resetForm } = useForm<FormValues>()

const [name] = defineField('name')
const [slug] = defineField('slug')
const [isCore] = defineField('is_core')

watch(name, (val) => {
  slug.value = generateSlug(val ?? '')
})

watch(
  () => props.open,
  (val) => {
    if (val) {
      resetForm({ values: { name: '', slug: '', is_core: false } })
    }
  },
)

const onSubmit = handleSubmit(async (values) => {
  const existingCount = modulesBySystem.value[props.systemId]?.length ?? 0
  const result = await createModule(props.systemId, {
    name: values.name,
    slug: values.slug,
    is_core: values.is_core,
    description: '',
    config: {},
    sort_order: existingCount,
  })
  if (result.ok) {
    emit('update:open', false)
  } else {
    setErrors(result.errors)
  }
})
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>New Module</DialogTitle>
        <DialogDescription class="sr-only"
          >Create a new module within this system</DialogDescription
        >
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="space-y-1.5">
          <Label for="mod-name">Name</Label>
          <Input id="mod-name" v-model="name" placeholder="Core Rules" />
          <p v-if="errors.name" class="text-destructive text-xs">
            {{ errors.name }}
          </p>
        </div>

        <div class="space-y-1.5">
          <Label for="mod-slug">Slug</Label>
          <Input id="mod-slug" v-model="slug" placeholder="core-rules" />
          <p v-if="errors.slug" class="text-destructive text-xs">
            {{ errors.slug }}
          </p>
        </div>

        <div v-if="showCoreCheckbox" class="flex items-center gap-2">
          <input
            id="mod-core"
            v-model="isCore"
            type="checkbox"
            class="rounded border-border bg-background text-primary focus:ring-ring"
          />
          <Label for="mod-core">Core module</Label>
        </div>
        <p v-if="errors.is_core" class="text-destructive text-xs">
          {{ errors.is_core }}
        </p>

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
