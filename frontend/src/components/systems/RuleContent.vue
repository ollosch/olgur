<script setup lang="ts">
import { computed } from 'vue'
import type { IndexEntry, Rule } from '@/types/domain'

interface Props {
  content: string
  indexEntries: IndexEntry[]
  allRules: Rule[]
}

const props = defineProps<Props>()
const emit = defineEmits<{ selectRule: [rule: Rule] }>()

type Segment =
  | { type: 'text'; value: string }
  | { type: 'acronym'; key: string; entry: IndexEntry | null }
  | { type: 'link'; key: string; rule: Rule | null }
  | { type: 'raw'; value: string }

const segments = computed((): Segment[] => {
  const result: Segment[] = []
  const pattern = /\{\{([A-Z]):([^}]+)\}\}/g
  let last = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(props.content)) !== null) {
    if (match.index > last) {
      result.push({ type: 'text', value: props.content.slice(last, match.index) })
    }

    const prefix = match[1]
    const key = match[2] ?? ''

    if (prefix === 'A') {
      const entry = props.indexEntries.find((e) => e.term === key) ?? null
      result.push({ type: 'acronym', key, entry })
    } else if (prefix === 'L') {
      const rule = props.allRules.find((r) => r.number === key) ?? null
      result.push({ type: 'link', key, rule })
    } else {
      result.push({ type: 'raw', value: match[0] })
    }

    last = match.index + match[0].length
  }

  if (last < props.content.length) {
    result.push({ type: 'text', value: props.content.slice(last) })
  }

  return result
})

// Click handler — called by parent delegation
function onLinkClick(number: string) {
  const rule = props.allRules.find((r) => r.number === number)
  if (rule) emit('selectRule', rule)
}

defineExpose({ onLinkClick })
</script>

<template>
  <span class="whitespace-pre-wrap leading-relaxed">
    <template v-for="(seg, i) in segments" :key="i">
      <span v-if="seg.type === 'text'">{{ seg.value }}</span>
      <span v-else-if="seg.type === 'raw'">{{ seg.value }}</span>

      <!-- acronym: plain styled span (tooltips disabled) -->
      <span
        v-else-if="seg.type === 'acronym'"
        class="underline decoration-dotted cursor-help text-primary/80"
      >{{ seg.key }}</span>

      <!-- link: data attribute only, no event handlers — parent does delegation -->
      <a
        v-else-if="seg.type === 'link'"
        :data-rule-number="seg.key"
        class="underline decoration-dotted cursor-pointer text-primary font-medium hover:text-primary/80 transition-colors"
      >{{ seg.key }}</a>
    </template>
  </span>
</template>
