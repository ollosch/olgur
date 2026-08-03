<script setup lang="ts">
import { computed, ref } from 'vue'
import { useContentStore } from '@/stores/content'
import type { Rule } from '@/types/domain'
import { rankRule } from '@/lib/utils'
import { renderContent } from '@/lib/renderContent'

import { Input } from '@/components/ui/input'

interface Props {
  moduleId: string
  excludedIds?: Set<string>
  excludedNumbers?: Set<string>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [rule: Rule]
}>()

const contentStore = useContentStore()
const search = ref('')

const results = computed((): Rule[] => {
  const q = search.value.trim().toLowerCase()
  if (q.length < 1) return []

  const moduleRules = contentStore.rulesByModule[props.moduleId] ?? []

  return moduleRules
    .filter((r) => !props.excludedIds?.has(r.id) && !props.excludedNumbers?.has(r.number))
    .map((r) => ({ rule: r, rank: rankRule(r, q) }))
    .filter((x) => x.rank < 6)
    .sort((a, b) => a.rank - b.rank || a.rule.number.localeCompare(b.rule.number))
    .map((x) => x.rule)
})

const showDropdown = computed(() => search.value.trim().length >= 1)

function select(rule: Rule): void {
  search.value = ''
  emit('select', rule)
}
</script>

<template>
  <div class="relative">
    <Input
      v-model="search"
      placeholder="Search by rule number or title…"
      autocomplete="off"
      @keydown.enter.prevent
    />
    <div
      v-if="showDropdown"
      class="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md"
    >
      <div v-if="results.length === 0" class="py-6 text-center text-sm text-muted-foreground">
        No matching rules
      </div>
      <button
        v-for="result in results"
        :key="result.id"
        type="button"
        class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
        @click="select(result)"
      >
        <span class="font-mono text-primary shrink-0">{{ result.number }}</span>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span class="text-foreground/80 min-w-0 truncate" v-html="renderContent(result.title)" />
      </button>
    </div>
  </div>
</template>
