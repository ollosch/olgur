<script setup lang="ts">
import { computed, ref } from 'vue'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import type { Rule } from '@/types/domain'
import { rankRule } from '@/lib/utils'
import { renderContent } from '@/lib/renderContent'

import { Input } from '@/components/ui/input'

interface Props {
  moduleId: string
  scope?: 'module' | 'system'
  excludedIds?: Set<string>
  excludedNumbers?: Set<string>
}

const props = withDefaults(defineProps<Props>(), { scope: 'module' })
const emit = defineEmits<{
  select: [rule: Rule]
}>()

const contentStore = useContentStore()
const systemStore = useSystemStore()
const search = ref('')

const modulesById = computed(() => new Map(systemStore.modules.map((m) => [m.id, m])))

const sourceRules = computed((): Rule[] => {
  if (props.scope === 'system') {
    return systemStore.modules.flatMap((m) => contentStore.rulesByModule[m.id] ?? [])
  }
  return contentStore.rulesByModule[props.moduleId] ?? []
})

function isExcluded(rule: Rule): boolean {
  if (props.excludedIds?.has(rule.id)) return true
  if (!props.excludedNumbers) return false

  const mod = modulesById.value.get(rule.module_id)
  const qualified = mod ? `${mod.slug}:${rule.number}` : rule.number

  if (props.excludedNumbers.has(qualified)) return true
  // A bare ref only means this module unless rule numbers are system-wide.
  return (
    (contentStore.globalRuleNumbers || rule.module_id === props.moduleId) &&
    props.excludedNumbers.has(rule.number)
  )
}

function showModule(rule: Rule): boolean {
  return props.scope === 'system' && rule.module_id !== props.moduleId
}

function moduleLabel(rule: Rule): string {
  const mod = modulesById.value.get(rule.module_id)
  return mod?.name ?? rule.module_id
}

const results = computed((): Rule[] => {
  const q = search.value.trim().toLowerCase()
  if (q.length < 1) return []

  return sourceRules.value
    .filter((r) => !isExcluded(r))
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
        <span
          v-if="showModule(result)"
          class="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
        >
          {{ moduleLabel(result) }}
        </span>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span
          class="text-foreground/80 min-w-0 truncate"
          :data-rule-context="result.module_id"
          v-html="renderContent(result.title)"
        />
      </button>
    </div>
  </div>
</template>
