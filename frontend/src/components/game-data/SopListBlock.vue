<script setup lang="ts">
import { renderContent } from '@/lib/renderContent'
import type { SopList } from '@/types/domain'

const props = defineProps<{
  list: SopList
  ignoredTags: string[]
  boldTags: string[]
}>()

function runVisible(tags: string[]): boolean {
  if (tags.length === 0) return true
  return tags.some((t) => !props.ignoredTags.includes(t))
}

function runBold(tags: string[]): boolean {
  return runVisible(tags) && tags.some((t) => props.boldTags.includes(t))
}
</script>

<template>
  <component
    :is="list.ordered ? 'ol' : 'ul'"
    :class="list.ordered ? 'list-decimal' : 'list-disc'"
    class="list-inside pl-4 space-y-1 text-sm text-foreground/90"
  >
    <li v-for="(item, i) in list.items" :key="i">
      <template v-for="(run, ri) in item.runs" :key="ri">
        <template v-if="runVisible(run.tags)">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <strong v-if="runBold(run.tags)" v-html="renderContent(run.text)" />
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-else v-html="renderContent(run.text)" />
        </template>
      </template>
      <SopListBlock
        v-if="item.children"
        :list="item.children"
        :ignored-tags="ignoredTags"
        :bold-tags="boldTags"
      />
    </li>
  </component>
</template>
