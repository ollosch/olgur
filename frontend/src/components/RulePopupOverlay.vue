<script setup lang="ts">
import { computed } from 'vue'
import { useRulePopup } from '@/composables/useRulePopup'
import { renderContent } from '@/lib/renderContent'
import { useAppSettingsStore } from '@/stores/appSettings'

const { state, navigateToNumber } = useRulePopup()
const appSettings = useAppSettingsStore()

const style = computed(() => ({
  left: `${state.value.x}px`,
  top: `${state.value.y}px`,
  maxWidth: '320px',
}))

function onClick(e: MouseEvent) {
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
            >Open rule</button>
          </div>
          <p class="font-semibold text-foreground mb-1">{{ state.content.rule.title }}</p>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <p
            v-if="state.content.rule.content"
            class="text-foreground/70 leading-relaxed whitespace-pre-wrap"
            v-html="renderContent(state.content.rule.content, { acronymPopups: appSettings.acronymPopups })"
          />
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
  transform: translateY(-4px);
}
</style>
