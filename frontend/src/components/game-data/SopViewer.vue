<script setup lang="ts">
/**
 * SopViewer — renders a Sequence of Play.
 *
 * The JSON schema is NOT yet finalised. This component uses a provisional
 * structure that matches the agreed description from HANDOFF.md:
 *
 *   Phase → Section (start/during/end) → Step → Clauses
 *
 * Tags live at the clause level. A step with all clauses filtered out is hidden.
 * Update this component once the real schema is confirmed.
 */

export interface SopClause {
  text: string
  tag?: string
}

export interface SopStep {
  id: string
  label: string
  clauses: SopClause[]
}

export interface SopSection {
  id: string
  label: string
  steps: SopStep[]
}

export interface SopPhase {
  id: string
  label: string
  sections: SopSection[]
}

export interface SopContent {
  kind: 'sop'
  title?: string
  phases: SopPhase[]
  active_tags?: string[]
}

const props = defineProps<{ content: SopContent }>()

function isClauseVisible(clause: SopClause): boolean {
  if (!clause.tag) return true
  const activeTags = props.content.active_tags ?? []
  return activeTags.includes(clause.tag)
}

function visibleClauses(step: SopStep): SopClause[] {
  return step.clauses.filter(isClauseVisible)
}

function isStepVisible(step: SopStep): boolean {
  return visibleClauses(step).length > 0
}

function visibleSteps(section: SopSection): SopStep[] {
  return section.steps.filter(isStepVisible)
}

function isSectionVisible(section: SopSection): boolean {
  return visibleSteps(section).length > 0
}
</script>

<template>
  <div class="space-y-8">
    <div
      v-for="phase in props.content.phases"
      :key="phase.id"
      class="border border-border rounded-lg overflow-hidden"
    >
      <!-- Phase header -->
      <div class="bg-muted/40 border-b border-border px-4 py-2">
        <h2 class="text-sm font-semibold text-foreground uppercase tracking-wide">
          {{ phase.label }}
        </h2>
      </div>

      <div class="divide-y divide-border">
        <template
          v-for="section in phase.sections"
          :key="section.id"
        >
          <div
            v-if="isSectionVisible(section)"
            class="px-4 py-3"
          >
            <!-- Section label -->
            <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {{ section.label }}
            </p>

            <ol class="space-y-2 list-decimal list-inside">
              <li
                v-for="step in visibleSteps(section)"
                :key="step.id"
                class="text-sm text-foreground"
              >
                <span class="font-medium">{{ step.label }}</span>
                <ul
                  v-if="visibleClauses(step).length > 0"
                  class="ml-4 mt-1 space-y-0.5 list-[circle] list-inside"
                >
                  <li
                    v-for="(clause, ci) in visibleClauses(step)"
                    :key="ci"
                    class="text-xs text-foreground/80"
                  >
                    {{ clause.text }}
                    <span
                      v-if="clause.tag"
                      class="ml-1 text-[9px] text-muted-foreground bg-muted rounded px-1 py-0.5"
                    >
                      {{ clause.tag }}
                    </span>
                  </li>
                </ul>
              </li>
            </ol>
          </div>
        </template>
      </div>
    </div>

    <p
      v-if="props.content.phases.length === 0"
      class="text-sm text-muted-foreground italic"
    >
      No sequence of play data available.
    </p>
  </div>
</template>
