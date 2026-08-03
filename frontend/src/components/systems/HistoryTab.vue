<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useHistoryStore } from '@/stores/history'
import { renderContent } from '@/lib/renderContent'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const historyStore = useHistoryStore()

function open(entry: (typeof historyStore.currentSystemEntries)[number]): void {
  const systemId = route.params['systemId'] as string
  if (entry.type === 'rule') {
    router.push({ name: 'system-rule', params: { systemId, ruleId: entry.id } })
  }
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
</script>

<template>
  <ScrollArea class="h-full">
    <div class="py-2">
      <div v-if="historyStore.currentSystemEntries.length === 0" class="px-4 py-4 text-xs text-muted-foreground text-center">
        No history yet.
      </div>
      <button
        v-for="entry in historyStore.currentSystemEntries"
        :key="entry.id + entry.viewedAt.getTime()"
        class="w-full flex items-start gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
        @click="open(entry)"
      >
        <Clock class="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-xs text-primary shrink-0">{{ entry.number }}</span>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <span class="text-xs text-foreground truncate" v-html="renderContent(entry.title)" />
          </div>
          <span class="text-[10px] text-muted-foreground">{{ relativeTime(entry.viewedAt) }}</span>
        </div>
      </button>
    </div>
  </ScrollArea>
</template>
