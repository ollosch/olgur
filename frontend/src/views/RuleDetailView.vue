<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useBookmarkStore } from '@/stores/bookmarks'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { renderContent } from '@/lib/renderContent'
import type { Rule, Module } from '@/types/domain'

import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowUp, Star } from 'lucide-vue-next'
import RuleDetailChildren from '@/components/systems/RuleDetailChildren.vue'
import RuleTocView from '@/components/systems/RuleTocView.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const contentStore = useContentStore()
const appSettings = useAppSettingsStore()
const bookmarkStore = useBookmarkStore()

const systemId = computed(() => route.params['systemId'] as string)
const ruleId = computed(() => route.params['ruleId'] as string)

// ---------------------------------------------------------------------------
// Derived state (mirrors SystemView but scoped to this view)
// ---------------------------------------------------------------------------

const activeIds = computed((): string[] =>
  systemStore.membership?.config?.active_module_ids ?? [],
)

const activeModules = computed((): Module[] =>
  systemStore.modules.filter((m) => m.is_core || activeIds.value.includes(m.id)),
)

const allRules = computed((): Rule[] =>
  activeModules.value.flatMap((m) => contentStore.rulesByModule[m.id] ?? []),
)

const rulesById = computed((): Map<string, Rule> => {
  const m = new Map<string, Rule>()
  for (const r of allRules.value) m.set(r.id, r)
  return m
})

const childrenMap = computed((): Map<string | null, Rule[]> => {
  const m = new Map<string | null, Rule[]>()
  for (const r of allRules.value) {
    const key = r.parent_id
    const bucket = m.get(key)
    if (bucket) {
      bucket.push(r)
    } else {
      m.set(key, [r])
    }
  }
  for (const bucket of m.values()) {
    bucket.sort((a, b) => a.sort_order - b.sort_order)
  }
  return m
})

const tocDepth = computed(() => systemStore.currentSystem?.config?.toc_depth ?? 0)

const selectedRule = computed((): Rule | null => rulesById.value.get(ruleId.value) ?? null)

const parentRule = computed((): Rule | null =>
  selectedRule.value?.parent_id ? (rulesById.value.get(selectedRule.value.parent_id) ?? null) : null,
)

function ruleDepth(rule: Rule): number {
  let depth = 1
  let current: Rule = rule
  while (current.parent_id !== null) {
    const parent = rulesById.value.get(current.parent_id)
    if (!parent) break
    current = parent
    depth++
  }
  return depth
}

const showToc = computed(() => {
  if (!selectedRule.value) return false
  return ruleDepth(selectedRule.value) <= tocDepth.value
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function selectRule(rule: Rule): void {
  router.push({ name: 'system-rule', params: { systemId: systemId.value, ruleId: rule.id } })
}

// ---------------------------------------------------------------------------
// Scroll to top when navigating to a different rule
// ---------------------------------------------------------------------------

const scrollEl = ref<HTMLElement | null>(null)

watch(ruleId, () => {
  scrollEl.value?.scrollTo({ top: 0 })
})
</script>

<template>
  <div ref="scrollEl" class="overflow-auto p-6 h-full">
    <div v-if="selectedRule">
      <div class="mb-4">
        <Button
          variant="ghost"
          size="sm"
          class="mb-3 -ml-2 h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          @click="router.back()"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          Back
        </Button>
        <Button
          v-if="parentRule"
          variant="ghost"
          size="sm"
          class="mb-3 h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          @click="selectRule(parentRule)"
        >
          <ArrowUp class="w-3.5 h-3.5" />
          <span class="font-mono">{{ parentRule.number }}</span>
        </Button>
        <div class="flex items-baseline gap-3">
          <span class="text-primary font-mono text-lg font-bold">
            {{ selectedRule.number }}
          </span>
          <h2 class="text-foreground text-xl font-semibold">{{ selectedRule.title }}</h2>
          <button
            class="ml-auto shrink-0 p-1 rounded hover:bg-muted/40 transition-colors"
            :title="bookmarkStore.isBookmarked('rule', selectedRule.id) ? 'Remove bookmark' : 'Bookmark rule'"
            @click="bookmarkStore.isBookmarked('rule', selectedRule.id)
              ? bookmarkStore.removeBookmark('rule', selectedRule.id)
              : bookmarkStore.addBookmark('rule', selectedRule.id)"
          >
            <Star
              class="w-4 h-4 transition-colors"
              :class="bookmarkStore.isBookmarked('rule', selectedRule.id) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'"
            />
          </button>
        </div>
      </div>

      <!-- ToC view: depth <= toc_depth -->
      <RuleTocView
        v-if="showToc"
        :rule="selectedRule"
        :children-map="childrenMap"
        @select="selectRule"
      />

      <!-- Full content view: depth > toc_depth -->
      <template v-else>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p
          class="text-foreground/80 text-sm leading-relaxed mb-6 whitespace-pre-wrap"
          v-html="renderContent(selectedRule.content, { acronymPopups: appSettings.acronymPopups })"
        />

        <RuleDetailChildren
          :rule="selectedRule"
          :children-map="childrenMap"
          :depth="ruleDepth(selectedRule) - 1"
          :toc-depth="tocDepth"
          @select-rule="selectRule"
        />
      </template>
    </div>

    <!-- Rule not found -->
    <div v-else class="text-muted-foreground text-sm">
      Rule not found.
    </div>
  </div>
</template>
