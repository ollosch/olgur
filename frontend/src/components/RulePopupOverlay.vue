<script setup lang="ts">
import { computed } from 'vue'
import { useRulePopup } from '@/composables/useRulePopup'
import { renderContent } from '@/lib/renderContent'
import { useAppSettingsStore } from '@/stores/appSettings'

const { state, navigateToNumber, navigateToRange } = useRulePopup()
const appSettings = useAppSettingsStore()

const style = computed(() => {
  const base = {
    left: `${state.value.x}px`,
    maxWidth: '320px',
  }
  if (state.value.above) {
    return { ...base, bottom: `${window.innerHeight - state.value.y}px` }
  }
  return { ...base, top: `${state.value.y}px` }
})

function onClick(e: MouseEvent) {
  const rangeAnchor = (e.target as HTMLElement).closest<HTMLElement>('[data-rule-range]')
  if (rangeAnchor) {
    e.preventDefault()
    navigateToRange(rangeAnchor.dataset['ruleRange'] ?? '')
    return
  }
  const anchor = (e.target as HTMLElement).closest<HTMLElement>('[data-rule-number]')
  if (!anchor) return
  e.preventDefault()
  navigateToNumber(anchor.dataset['ruleNumber'] ?? '')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="popup">
      <div
        v-if="state.visible && state.content"
        data-popup-overlay
        class="fixed z-60 rounded-md border border-border bg-popover text-popover-foreground shadow-md p-3 text-xs pointer-events-auto overflow-y-auto"
        :style="{ ...style, maxHeight: '60vh' }"
        @click="onClick"
      >
        <!-- Rule popup -->
        <template v-if="state.content.type === 'rule'">
          <div class="flex items-baseline justify-between gap-2 mb-0.5">
            <p class="font-mono text-primary font-bold">{{ state.content.rule.number }}</p>
            <button
              type="button"
              class="text-[10px] text-primary underline decoration-dotted hover:text-primary/80 transition-colors shrink-0"
              @click.stop="navigateToNumber(state.content.rule.number)"
            >Open</button>
          </div>
          <p class="font-semibold text-foreground mb-1">{{ state.content.rule.title }}</p>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <p
            v-if="state.content.rule.content"
            class="text-foreground/70 leading-relaxed whitespace-pre-wrap"
            v-html="renderContent(state.content.rule.content, { acronymPopups: appSettings.acronymPopups })"
          />
        </template>

        <!-- Range popup -->
        <template v-else-if="state.content.type === 'range'">
          <div class="flex items-baseline justify-between gap-2 mb-2">
            <p class="font-mono text-primary font-bold">
              {{ state.content.rules[0]?.number }} – {{ state.content.rules[state.content.rules.length - 1]?.number }}
            </p>
            <button
              type="button"
              class="text-[10px] text-primary underline decoration-dotted hover:text-primary/80 transition-colors shrink-0"
              @click.stop="navigateToRange(`${state.content.rules[0]?.number}-${state.content.rules[state.content.rules.length - 1]?.number}`)"
            >Open range</button>
          </div>
          <div
            v-for="(rule, i) in state.content.rules"
            :key="rule.id"
            :class="i > 0 ? 'mt-3 pt-3 border-t border-border/40' : ''"
          >
            <p class="font-semibold text-foreground mb-1">
              <span class="font-mono text-primary mr-1.5">{{ rule.number }}</span>{{ rule.title }}
            </p>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p
              v-if="rule.content"
              class="text-foreground/70 leading-relaxed whitespace-pre-wrap"
              v-html="renderContent(rule.content, { acronymPopups: appSettings.acronymPopups })"
            />
          </div>
        </template>

        <!-- Acronym popup -->
        <template v-else-if="state.content.type === 'acronym'">
          <p class="font-semibold text-foreground mb-1">{{ state.content.entry.term }}</p>
          <p
            v-if="state.content.entry.definition"
            class="text-foreground/70 leading-relaxed mb-2"
          >{{ state.content.entry.definition }}</p>
          <p v-if="state.content.entry.relations?.rule_refs?.length" class="text-foreground/60 mb-1">
            <span class="font-medium text-foreground/80">See rules: </span>
            <template v-for="(ref, i) in state.content.entry.relations.rule_refs" :key="ref">
              <a
                v-if="ref.includes('-')"
                :data-rule-range="ref"
                class="underline decoration-dotted cursor-pointer text-primary font-medium hover:text-primary/80 transition-colors"
              >{{ ref }}</a>
              <a
                v-else
                :data-rule-number="ref"
                class="underline decoration-dotted cursor-pointer text-primary font-medium hover:text-primary/80 transition-colors"
              >{{ ref }}</a><span v-if="i < (state.content.entry.relations.rule_refs?.length ?? 0) - 1">, </span>
            </template>
          </p>
          <p v-if="state.content.entry.relations?.see_also?.length" class="text-foreground/60">
            <span class="font-medium text-foreground/80">See also: </span>
            {{ state.content.entry.relations.see_also.join(', ') }}
          </p>
        </template>

        <!-- Inactive module popup -->
        <template v-else-if="state.content.type === 'inactive_module'">
          <p class="text-muted-foreground italic text-xs">Module not active</p>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translateY(v-bind("state.above ? '4px' : '-4px'"));
}
</style>
