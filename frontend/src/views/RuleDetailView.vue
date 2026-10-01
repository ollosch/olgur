<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentStore } from '@/stores/content'
import { useSystemStore } from '@/stores/system'
import { useAuthorization } from '@/composables/useAuthorization'
import type { Rule } from '@/types/domain'

import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from '@lucide/vue'
import RuleDetailChildren from '@/components/systems/RuleDetailChildren.vue'
import RuleTocView from '@/components/systems/RuleTocView.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const contentStore = useContentStore()
const { canEdit } = useAuthorization()

const systemId = computed(() => route.params['systemId'] as string)
const ruleId = computed(() => route.params['ruleId'] as string)
const toRuleId = computed(() => route.query['to'] as string | undefined)

// ---------------------------------------------------------------------------
// Derived state
// ---------------------------------------------------------------------------

const tocDepth = computed(() => systemStore.currentSystem?.config?.toc_depth ?? 0)

const selectedRule = computed((): Rule | null => contentStore.rulesById.get(ruleId.value) ?? null)
const toRule = computed((): Rule | null =>
  toRuleId.value ? (contentStore.rulesById.get(toRuleId.value) ?? null) : null,
)

const isRangeMode = computed(() => !!toRuleId.value)

const canEditRules = computed((): boolean => {
  if (!selectedRule.value) return false
  return canEdit.value(selectedRule.value.module_id)
})

// ---------------------------------------------------------------------------
// Range validation and slice
// ---------------------------------------------------------------------------

interface RangeValidation {
  valid: boolean
  error?: string
}

const rangeValidation = computed((): RangeValidation => {
  const from = selectedRule.value
  const to = toRule.value

  if (!from) return { valid: false, error: 'Rule not found.' }
  if (!to) return { valid: false, error: `Range target rule not found.` }

  if (from.module_id !== to.module_id) {
    return { valid: false, error: 'Invalid range: both rules must belong to the same module.' }
  }

  const flattened = contentStore.flattenedRulesByModule.get(from.module_id) ?? []
  const fromIndex = flattened.findIndex((r) => r.id === from.id)
  const toIndex = flattened.findIndex((r) => r.id === to.id)

  if (toIndex < fromIndex) {
    return {
      valid: false,
      error: `Invalid range: ${to.number} comes before ${from.number} in document order.`,
    }
  }

  return { valid: true }
})

const rulesInRange = computed((): Rule[] => {
  const from = selectedRule.value
  const to = toRule.value
  if (!from || !to || !rangeValidation.value.valid) return []

  const flattened = contentStore.flattenedRulesByModule.get(from.module_id) ?? []
  const fromIndex = flattened.findIndex((r) => r.id === from.id)
  const toIndex = flattened.findIndex((r) => r.id === to.id)

  return flattened.slice(fromIndex, toIndex + 1)
})

// ---------------------------------------------------------------------------
// Segmented breadcrumb (single-rule mode only)
//
// The rule number (e.g. "A.11.2.3.4") is split on "." into progressive prefixes.
// Each prefix that resolves to a known rule becomes a clickable segment.
// The final segment (current rule) is rendered but not clickable.
// ---------------------------------------------------------------------------

interface BreadcrumbSegment {
  label: string // the partial number up to this point, e.g. "A.11.2"
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
    const resolved = isCurrent
      ? rule
      : (contentStore.resolveRuleReference(label, { moduleId: rule.module_id }) ?? null)
    segments.push({ label, rule: resolved, isCurrent })
  }

  return segments
})

const showToc = computed(() => {
  if (!selectedRule.value) return false
  return (contentStore.ruleDepths.get(selectedRule.value.id) ?? 0) < tocDepth.value
})

// ---------------------------------------------------------------------------
// Navigation — always navigates to single-rule view (drops ?to=)
// ---------------------------------------------------------------------------

function selectRule(rule: Rule): void {
  router.push({ name: 'system-rule', params: { systemId: systemId.value, ruleId: rule.id } })
}

// ---------------------------------------------------------------------------
// Rule deletion
//
// After a rule is deleted the content store no longer contains it. If the
// currently selected rule was removed, navigate back to the system TOC.
// ---------------------------------------------------------------------------

function handleRuleDeleted(): void {
  if (!contentStore.rulesById.has(ruleId.value)) {
    router.push({ name: 'system', params: { systemId: systemId.value } })
  }
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
    <!-- ------------------------------------------------------------------ -->
    <!-- Range mode                                                           -->
    <!-- ------------------------------------------------------------------ -->
    <div v-if="isRangeMode">
      <!-- Nav bar -->
      <div class="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          class="-ml-2 h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          @click="router.back()"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          Back
        </Button>

        <span
          v-if="rangeValidation.valid && selectedRule && toRule"
          class="font-mono text-xs text-muted-foreground/60 mx-2"
        >
          {{ selectedRule.number }} – {{ toRule.number }}
          <span class="ml-1">({{ rulesInRange.length }} rules)</span>
        </span>

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

      <!-- Validation error -->
      <p v-if="!rangeValidation.valid" class="text-destructive text-sm">
        {{ rangeValidation.error }}
      </p>

      <!-- Rules in range -->
      <div v-else>
        <div v-for="rule in rulesInRange" :key="rule.id" class="mt-4">
          <RuleDetailChildren
            :rule="rule"
            :children-map="contentStore.childrenMap"
            :depth="contentStore.ruleDepths.get(rule.id) ?? 0"
            :toc-depth="tocDepth"
            :can-edit="canEdit(rule.module_id)"
            :standalone="true"
            @select-rule="selectRule"
            @rule-deleted="handleRuleDeleted"
          />
        </div>
      </div>
    </div>

    <!-- ------------------------------------------------------------------ -->
    <!-- Single-rule mode                                                     -->
    <!-- ------------------------------------------------------------------ -->
    <div v-else-if="selectedRule">
      <!-- Nav bar: Back | breadcrumb | Forward -->
      <div class="flex items-center justify-between mb-4">
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
            >
              {{ seg.label.split('.').pop() }}
            </button>
            <span v-else class="text-muted-foreground/40">{{ seg.label.split('.').pop() }}</span>
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

      <!-- ToC view: depth <= toc_depth -->
      <RuleTocView
        v-if="showToc"
        :rule="selectedRule"
        :children-map="contentStore.childrenMap"
        @select="selectRule"
      />

      <!-- Full content view: depth > toc_depth -->
      <RuleDetailChildren
        v-else
        :rule="selectedRule"
        :children-map="contentStore.childrenMap"
        :depth="0"
        :toc-depth="tocDepth"
        :can-edit="canEditRules"
        @select-rule="selectRule"
        @rule-deleted="handleRuleDeleted"
      />
    </div>

    <!-- Rule not found -->
    <div v-else class="text-muted-foreground text-sm">Rule not found.</div>
  </div>
</template>
