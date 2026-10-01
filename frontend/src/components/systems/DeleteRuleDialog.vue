<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import type { Rule, RuleDeletionMode } from '@/types/domain'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useModalShortcutGuard } from '@/composables/useModalShortcutGuard'

interface Props {
  open: boolean
  rule: Rule
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  deleted: []
}>()

const systemStore = useSystemStore()
const contentStore = useContentStore()

useModalShortcutGuard(() => props.open)

const mode = ref<RuleDeletionMode>('re_parent')
const deleting = ref(false)

const childCount = computed(() => contentStore.childrenMap.get(props.rule.id)?.length ?? 0)
const hasChildren = computed(() => childCount.value > 0)

watch(
  () => props.open,
  (open) => {
    if (open) mode.value = 're_parent'
  },
)

async function confirm(): Promise<void> {
  deleting.value = true
  const result = await contentStore.deleteRule(
    systemStore.currentSystem?.id ?? '',
    props.rule,
    mode.value,
  )
  deleting.value = false

  if (result.ok) {
    emit('deleted')
    emit('update:open', false)
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Delete Rule</DialogTitle>
        <DialogDescription>
          Delete rule <span class="font-mono">{{ rule.number }}</span
          >.
        </DialogDescription>
      </DialogHeader>

      <div v-if="hasChildren" class="space-y-3">
        <p class="text-sm text-muted-foreground">
          This rule has {{ childCount }} direct child rule{{ childCount === 1 ? '' : 's' }}. Choose
          how to handle them:
        </p>
        <RadioGroup v-model="mode" class="space-y-3">
          <div class="flex items-start gap-2 text-sm">
            <RadioGroupItem id="delete-mode-re-parent" value="re_parent" class="mt-0.5" />
            <Label for="delete-mode-re-parent" class="cursor-pointer">
              <span class="font-medium">Re-parent</span>
              <span class="block text-muted-foreground text-xs">
                Move children up to this rule's parent.
              </span>
            </Label>
          </div>
          <div class="flex items-start gap-2 text-sm">
            <RadioGroupItem id="delete-mode-recursive" value="recursive" class="mt-0.5" />
            <Label for="delete-mode-recursive" class="cursor-pointer">
              <span class="font-medium">Recursive</span>
              <span class="block text-muted-foreground text-xs">
                Delete this rule and all of its descendants.
              </span>
            </Label>
          </div>
        </RadioGroup>
      </div>
      <p v-else class="text-sm text-muted-foreground">
        This rule has no children. This action cannot be undone.
      </p>

      <DialogFooter>
        <Button variant="ghost" @click="emit('update:open', false)">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="confirm">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
