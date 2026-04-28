<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppSettingsStore } from '@/stores/appSettings'
import { useBookmarkStore } from '@/stores/bookmarks'
import { useContentStore } from '@/stores/content'
import { useLeftPanelStore } from '@/stores/leftPanel'
import { useSystemStore } from '@/stores/system'
import { renderContent } from '@/lib/renderContent'
import type { Rule, Module } from '@/types/domain'

import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Crosshair, Star } from 'lucide-vue-next'
import RuleDetailChildren from '@/components/systems/RuleDetailChildren.vue'
import RuleTocView from '@/components/systems/RuleTocView.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const contentStore = useContentStore()
const appSettings = useAppSettingsStore()
const bookmarkStore = useBookmarkStore()
const panelStore = useLeftPanelStore()

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

const rulesByNumber = computed((): Map<string, Rule> => {
  const m = new Map<string, Rule>()
  for (const r of allRules.value) m.set(r.number, r)
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

// ---------------------------------------------------------------------------
// Segmented breadcrumb
//
// The rule number (e.g. "A.11.2.3.4") is split on "." into progressive prefixes.
// Each prefix that resolves to a known rule becomes a clickable segment.
// The final segment (current rule) is rendered but not clickable.
// ---------------------------------------------------------------------------

interface BreadcrumbSegment {
  label: string   // the partial number up to this point, e.g. "A.11.2"
  rule: Rule | null
  isCurrent: boolean
}

const breadcrumbSegments = computed((): BreadcrumbSegment[] => {
  const rule = selectedRule.value
  if (!rule) return []

  const parts = rule.number.split('.')
  const segments: BreadcrumbSegment[] = []

  for (let i = 0; i < parts.length; i++) {
    const label = parts.slice(0, i + 1).join('.')
    const isCurrent = i === parts.length - 1
    const resolved = isCurrent ? rule : (rulesByNumber.value.get(label) ?? null)
    segments.push({ label, rule: resolved, isCurrent })
  }

  return segments
})

function showInTree(): void {
  panelStore.openToTab('tree')
  panelStore.treeActivatedTick++
}

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
// Navigation
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

        <!-- Nav bar: Back | breadcrumb | Forward -->
        <div class="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            class="-ml-2 h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            @click="router.back()"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            Back
          </Button>

          <!-- Segmented breadcrumb: A.11.2.3.4 with each prefix clickable -->
          <nav class="flex items-center font-mono text-xs min-w-0 mx-2">
            <template v-for="(seg, i) in breadcrumbSegments" :key="seg.label">
              <span v-if="i > 0" class="text-muted-foreground/40 select-none">.</span>
              <button
                v-if="!seg.isCurrent && seg.rule"
                class="text-muted-foreground hover:text-primary transition-colors"
                @click="selectRule(seg.rule)"
              >{{ seg.label.split('.').at(-1) }}</button>
              <span v-else class="text-muted-foreground/40">{{ seg.label.split('.').at(-1) }}</span>
            </template>
          </nav>

          <Button
            variant="ghost"
            size="sm"
            class="-mr-2 h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
            @click="router.forward()"
          >
            Forward
            <ArrowRight class="w-3.5 h-3.5" />
          </Button>
        </div>

        <!-- Rule title row -->
        <div class="flex items-baseline gap-3">
          <span class="text-primary font-mono text-lg font-bold shrink-0">{{ selectedRule.number }}</span>
          <h2 class="text-foreground text-xl font-semibold">{{ selectedRule.title }}</h2>
          <div class="ml-auto flex items-center gap-1 shrink-0">
            <button
              class="p-1 rounded hover:bg-muted/40 transition-colors"
              title="Show in tree"
              @click="showInTree()"
            >
              <Crosshair class="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              class="p-1 rounded hover:bg-muted/40 transition-colors"
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
