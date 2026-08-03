<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useGameDataPanelStore } from '@/stores/gameDataPanel'
import { renderContent } from '@/lib/renderContent'
import { toast } from 'vue-sonner'
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue'

// ── Schema types ────────────────────────────────────────────────────────────

export interface SopRun {
  text: string
  tags: string[]
}

export interface SopSegment {
  mpath?: string
  player?: 'A' | 'D' | 'B' | null
  runs: SopRun[]
}

export interface SopStep {
  slug: string
  label: string
  segments: SopSegment[]
}

export interface SopPhase {
  slug: string
  label: string
  sniper?: boolean
  steps: SopStep[]
}

export interface SopTopic {
  slug: string
  label: string
  ref: string
}

export interface SopTopicGroup {
  slug: string
  label: string
  ref: string
  topics: SopTopic[]
}

export interface SopContent {
  topics: {
    groups: SopTopicGroup[]
  }
  pre_game: {
    segments: SopSegment[]
  }
  phases: SopPhase[]
}

// ── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{ sopId: string; content: SopContent }>()

// ── Store ────────────────────────────────────────────────────────────────────

const systemStore = useSystemStore()
const membershipStore = useMembershipStore()
const gameDataPanelStore = useGameDataPanelStore()

// ── Disabled topics (persisted to membership config) ─────────────────────────

const localDisabled = ref<string[]>(membershipStore.membership?.config?.ignored_tags ?? [])

watch(
  () => membershipStore.membership?.config?.ignored_tags,
  (val) => {
    localDisabled.value = val ?? []
  },
)

const disabledTopics = computed<string[]>(() => localDisabled.value)

async function saveDisabled(): Promise<void> {
  const systemId = systemStore.currentSystem?.id
  if (!systemId) return
  await membershipStore.updateMembership(systemId, { ignored_tags: localDisabled.value })
  toast.success('Topics saved.')
}

function setDisabled(value: string[]): void {
  localDisabled.value = value
}

// ── Topic helpers ─────────────────────────────────────────────────────────────

function isGroupDisabled(group: SopTopicGroup): boolean {
  if (group.topics.length === 0) return disabledTopics.value.includes(group.slug)
  return group.topics.every((t) => disabledTopics.value.includes(t.slug))
}

function isGroupPartial(group: SopTopicGroup): boolean {
  if (group.topics.length === 0) return false
  const disabledCount = group.topics.filter((t) => disabledTopics.value.includes(t.slug)).length
  return disabledCount > 0 && disabledCount < group.topics.length
}

function toggleGroup(group: SopTopicGroup): void {
  const slugs = group.topics.length === 0 ? [group.slug] : group.topics.map((t) => t.slug)
  const allDisabled = slugs.every((s) => disabledTopics.value.includes(s))
  if (allDisabled) {
    setDisabled(disabledTopics.value.filter((s) => !slugs.includes(s)))
  } else {
    const newDisabled = [...disabledTopics.value]
    for (const s of slugs) {
      if (!newDisabled.includes(s)) newDisabled.push(s)
    }
    setDisabled(newDisabled)
  }
}

function toggleTopic(slug: string): void {
  if (disabledTopics.value.includes(slug)) {
    setDisabled(disabledTopics.value.filter((s) => s !== slug))
  } else {
    setDisabled([...disabledTopics.value, slug])
  }
}

function resetTopics(): void {
  setDisabled([])
}

// ── Visibility logic ──────────────────────────────────────────────────────────

function isRunVisible(run: SopRun): boolean {
  if (run.tags.length === 0) return true
  return run.tags.some((tag) => !disabledTopics.value.includes(tag))
}

function visibleText(segment: SopSegment): string {
  const parts: string[] = []
  let prevHidden = false
  for (const run of segment.runs) {
    if (isRunVisible(run)) {
      if (prevHidden && parts.length > 0 && run.text.length > 0) {
        const tail = parts[parts.length - 1] ?? ''
        const needsSpace = tail.length > 0 && !tail.endsWith(' ') && !/^[,;.!?):]/.test(run.text)
        if (needsSpace) parts.push(' ')
      }
      parts.push(run.text)
      prevHidden = false
    } else {
      prevHidden = true
    }
  }
  return parts.join('').trim()
}

function isSegmentVisible(segment: SopSegment): boolean {
  return visibleText(segment).length > 0
}

function isStepVisible(step: SopStep): boolean {
  return step.segments.some(isSegmentVisible)
}

function isPhaseVisible(phase: SopPhase): boolean {
  return phase.steps.some(isStepVisible)
}

// ── Persisted UI state ────────────────────────────────────────────────────────
// Keyed by sopId in the game-data panel store so search/expand state survives
// the drawer (Sheet) being closed and reopened, and switching between SOP tabs.

const sopState = gameDataPanelStore.getSopState(props.sopId)

const searchQuery = computed({
  get: () => sopState.searchQuery,
  set: (value: string) => {
    sopState.searchQuery = value
  },
})

function matchesSearch(text: string): boolean {
  if (!searchQuery.value.trim()) return true
  return text.toLowerCase().includes(searchQuery.value.toLowerCase().trim())
}

function segmentMatchesSearch(segment: SopSegment): boolean {
  return matchesSearch(visibleText(segment))
}

function stepMatchesSearch(step: SopStep): boolean {
  return step.segments.some((seg) => isSegmentVisible(seg) && segmentMatchesSearch(seg))
}

function phaseMatchesSearch(phase: SopPhase): boolean {
  return phase.steps.some(stepMatchesSearch)
}

// ── Expand / collapse ─────────────────────────────────────────────────────────

const expandedPhases = sopState.expandedPhases

const preGameExpanded = computed({
  get: () => sopState.preGameExpanded,
  set: (value: boolean) => {
    sopState.preGameExpanded = value
  },
})

function togglePhase(slug: string): void {
  if (expandedPhases.has(slug)) {
    expandedPhases.delete(slug)
  } else {
    expandedPhases.add(slug)
  }
}

function isPhaseExpanded(phase: SopPhase): boolean {
  if (searchQuery.value.trim()) return phaseMatchesSearch(phase)
  return expandedPhases.has(phase.slug)
}

// ── Topics popover ────────────────────────────────────────────────────────────

const topicsOpen = ref(false)
const expandedGroups = sopState.expandedGroups

function toggleGroupExpand(slug: string): void {
  if (expandedGroups.has(slug)) {
    expandedGroups.delete(slug)
  } else {
    expandedGroups.add(slug)
  }
}

// ── Pre-game visible segments ─────────────────────────────────────────────────

const visiblePreGameSegments = computed(() =>
  props.content.pre_game.segments.filter(
    (seg) => isSegmentVisible(seg) && segmentMatchesSearch(seg),
  ),
)
</script>

<template>
  <div class="space-y-3">
    <!-- Toolbar -->
    <div class="flex items-center gap-2">
      <input
        v-model="searchQuery"
        type="search"
        placeholder="Search…"
        class="flex-1 h-8 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />

      <!-- Topics button -->
      <div class="relative">
        <button
          class="inline-flex items-center gap-1.5 h-8 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground"
          @click="topicsOpen = !topicsOpen"
        >
          Topics
          <svg
            class="h-3 w-3 opacity-60"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <!-- Popover panel -->
        <div
          v-if="topicsOpen"
          class="absolute right-0 top-full mt-1 z-50 w-64 rounded-md border border-border bg-popover shadow-md"
        >
          <!-- Backdrop -->
          <div class="fixed inset-0 z-40" @click="topicsOpen = false" />
          <div class="relative z-50 p-2 space-y-1">
            <div class="flex items-center justify-between px-1 pb-1 border-b border-border">
              <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                >Topics</span
              >
              <button
                class="text-xs text-muted-foreground hover:text-foreground underline"
                @click="resetTopics"
              >
                Reset
              </button>
            </div>

            <ScrollArea class="max-h-72 overflow-y-auto">
              <div class="space-y-0.5 py-1">
                <div v-for="group in props.content.topics.groups" :key="group.slug">
                  <!-- Group row -->
                  <div
                    class="flex items-center gap-2 px-1 py-1 rounded hover:bg-accent/50 cursor-pointer"
                  >
                    <!-- Checkbox -->
                    <input
                      type="checkbox"
                      class="h-3.5 w-3.5 cursor-pointer accent-primary"
                      :checked="!isGroupDisabled(group)"
                      :indeterminate="isGroupPartial(group)"
                      @change="toggleGroup(group)"
                    />
                    <span class="flex-1 text-sm select-none" @click="toggleGroup(group)">
                      {{ group.label }}
                      <span class="text-xs text-muted-foreground ml-1">{{ group.ref }}</span>
                    </span>
                    <!-- Expand arrow (only if has sub-topics) -->
                    <button
                      v-if="group.topics.length > 0"
                      class="p-0.5 text-muted-foreground hover:text-foreground"
                      @click.stop="toggleGroupExpand(group.slug)"
                    >
                      <svg
                        class="h-3 w-3 transition-transform"
                        :class="expandedGroups.has(group.slug) ? 'rotate-180' : ''"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>

                  <!-- Sub-topics -->
                  <div
                    v-if="group.topics.length > 0 && expandedGroups.has(group.slug)"
                    class="ml-5 space-y-0.5"
                  >
                    <div
                      v-for="topic in group.topics"
                      :key="topic.slug"
                      class="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-accent/50 cursor-pointer"
                      @click="toggleTopic(topic.slug)"
                    >
                      <input
                        type="checkbox"
                        class="h-3.5 w-3.5 cursor-pointer accent-primary"
                        :checked="!disabledTopics.includes(topic.slug)"
                        @click.stop
                        @change="toggleTopic(topic.slug)"
                      />
                      <span class="flex-1 text-sm select-none">
                        {{ topic.label }}
                        <span class="text-xs text-muted-foreground ml-1">{{ topic.ref }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div class="pt-2 border-t border-border mt-1">
              <button
                class="w-full h-8 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                @click="saveDisabled"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pre-Game Sequence -->
    <div
      v-if="visiblePreGameSegments.length > 0"
      class="border border-border rounded-lg overflow-hidden"
    >
      <button
        class="w-full flex items-center gap-2 bg-muted/40 border-b border-border px-4 py-2 text-left hover:bg-muted/70 transition-colors"
        @click="preGameExpanded = !preGameExpanded"
      >
        <svg
          class="h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0"
          :class="preGameExpanded ? 'rotate-90' : ''"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span class="text-sm font-semibold text-foreground uppercase tracking-wide"
          >Pre-Game Sequence</span
        >
      </button>

      <div v-if="preGameExpanded || searchQuery.trim()" class="px-4 py-3 space-y-1.5">
        <div
          v-for="(segment, i) in visiblePreGameSegments"
          :key="i"
          class="flex items-start gap-2 text-sm"
        >
          <span
            v-if="segment.mpath"
            class="shrink-0 font-mono text-xs text-muted-foreground w-10 text-right pt-0.5"
            >{{ segment.mpath }}</span
          >
          <span
            v-if="segment.player"
            class="shrink-0 text-[10px] font-bold rounded px-1 py-0.5 leading-none"
            :class="{
              'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400':
                segment.player === 'A',
              'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400':
                segment.player === 'D',
              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400':
                segment.player === 'B',
            }"
            >{{ segment.player }}</span
          >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="text-foreground/90" v-html="renderContent(visibleText(segment))" />
        </div>
      </div>
    </div>

    <!-- Phases -->
    <div
      v-for="phase in props.content.phases.filter(isPhaseVisible)"
      :key="phase.slug"
      class="border border-border rounded-lg overflow-hidden"
    >
      <!-- Phase header -->
      <button
        class="w-full flex items-center gap-2 bg-muted/40 border-b border-border px-4 py-2 text-left hover:bg-muted/70 transition-colors"
        @click="togglePhase(phase.slug)"
      >
        <svg
          class="h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0"
          :class="isPhaseExpanded(phase) ? 'rotate-90' : ''"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span class="text-sm font-semibold text-foreground uppercase tracking-wide">
          {{ phase.label }}
        </span>
        <span v-if="phase.sniper" class="text-xs text-muted-foreground" title="Sniper check"
          >†</span
        >
      </button>

      <!-- Steps -->
      <div v-if="isPhaseExpanded(phase)" class="divide-y divide-border">
        <template v-for="step in phase.steps.filter(isStepVisible)" :key="step.slug">
          <div v-if="stepMatchesSearch(step)" class="px-4 py-3">
            <p
              class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2"
            >
              {{ step.label }}
            </p>

            <div class="space-y-1.5">
              <div
                v-for="(segment, si) in step.segments.filter(
                  (seg) => isSegmentVisible(seg) && segmentMatchesSearch(seg),
                )"
                :key="si"
                class="flex items-start gap-2 text-sm"
              >
                <span
                  v-if="segment.mpath"
                  class="shrink-0 font-mono text-xs text-muted-foreground w-10 text-right pt-0.5"
                  >{{ segment.mpath }}</span
                >
                <span
                  v-if="segment.player"
                  class="shrink-0 text-[10px] font-bold rounded px-1 py-0.5 leading-none mt-0.5"
                  :class="{
                    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400':
                      segment.player === 'A',
                    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400':
                      segment.player === 'D',
                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400':
                      segment.player === 'B',
                  }"
                  >{{ segment.player }}</span
                >
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span class="text-foreground/90" v-html="renderContent(visibleText(segment))" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <p
      v-if="
        props.content.phases.filter(isPhaseVisible).length === 0 &&
        visiblePreGameSegments.length === 0
      "
      class="text-sm text-muted-foreground italic"
    >
      No sequence of play data available.
    </p>
  </div>
</template>
