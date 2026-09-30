<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSystemStore } from '@/stores/system'
import { useMembershipStore } from '@/stores/membership'
import { useGameDataPanelStore } from '@/stores/gameDataPanel'
import { renderContent } from '@/lib/renderContent'
import { toast } from 'vue-sonner'
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue'
import SopListBlock from '@/components/game-data/SopListBlock.vue'
import type {
  SopContent,
  SopRun,
  SopBlock,
  SopListItem,
  SopStep,
  SopPart,
  SopPhase,
  SopTopicGroup,
} from '@/types/domain'

// ── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{ sopId: string; content: SopContent }>()

// ── Store ────────────────────────────────────────────────────────────────────

const systemStore = useSystemStore()
const membershipStore = useMembershipStore()
const gameDataPanelStore = useGameDataPanelStore()

// ── Topic states (persisted to membership config) ───────────────────────────

type TopicState = 'normal' | 'bold' | 'hidden'

const STATE_ORDER: TopicState[] = ['normal', 'bold', 'hidden']

const localIgnored = ref<string[]>(membershipStore.membership?.config?.ignored_tags ?? [])
const localBold = ref<string[]>(membershipStore.membership?.config?.bold_tags ?? [])

watch(
  () => membershipStore.membership?.config?.ignored_tags,
  (val) => {
    localIgnored.value = val ?? []
  },
)

watch(
  () => membershipStore.membership?.config?.bold_tags,
  (val) => {
    localBold.value = val ?? []
  },
)

async function saveTopics(): Promise<void> {
  const systemId = systemStore.currentSystem?.id
  if (!systemId) return
  await membershipStore.updateMembership(systemId, {
    ignored_tags: localIgnored.value,
    bold_tags: localBold.value,
  })
  toast.success('Topics saved.')
}

function topicState(slug: string): TopicState {
  if (localIgnored.value.includes(slug)) return 'hidden'
  if (localBold.value.includes(slug)) return 'bold'
  return 'normal'
}

function setTopicState(slug: string, state: TopicState): void {
  const ignored = localIgnored.value.filter((s) => s !== slug)
  const bold = localBold.value.filter((s) => s !== slug)
  if (state === 'hidden') ignored.push(slug)
  else if (state === 'bold') bold.push(slug)
  localIgnored.value = ignored
  localBold.value = bold
}

function cycleTopic(slug: string): void {
  const current = topicState(slug)
  const idx = STATE_ORDER.indexOf(current)
  const next = STATE_ORDER[(idx + 1) % STATE_ORDER.length]!
  setTopicState(slug, next)
}

function resetTopics(): void {
  localIgnored.value = []
  localBold.value = []
}

// ── Group helpers ─────────────────────────────────────────────────────────────

function groupSlugs(group: SopTopicGroup): string[] {
  return group.topics.length === 0 ? [group.slug] : group.topics.map((t) => t.slug)
}

function isGroupHidden(group: SopTopicGroup): boolean {
  const slugs = groupSlugs(group)
  return slugs.length > 0 && slugs.every((s) => topicState(s) === 'hidden')
}

function isGroupPartial(group: SopTopicGroup): boolean {
  const slugs = groupSlugs(group)
  if (slugs.length === 0) return false
  const hiddenCount = slugs.filter((s) => topicState(s) === 'hidden').length
  return hiddenCount > 0 && hiddenCount < slugs.length
}

function toggleGroup(group: SopTopicGroup): void {
  const slugs = groupSlugs(group)
  const allHidden = slugs.length > 0 && slugs.every((s) => topicState(s) === 'hidden')
  for (const s of slugs) {
    setTopicState(s, allHidden ? 'normal' : 'hidden')
  }
}

// ── Run visibility / emphasis ─────────────────────────────────────────────────

function runVisible(run: SopRun): boolean {
  if (run.tags.length === 0) return true
  return run.tags.some((t) => !localIgnored.value.includes(t))
}

function runBold(run: SopRun): boolean {
  return runVisible(run) && run.tags.some((t) => localBold.value.includes(t))
}

// ── Block visibility ──────────────────────────────────────────────────────────

function itemVisible(item: SopListItem): boolean {
  if (item.runs.some(runVisible)) return true
  return item.children ? item.children.items.some(itemVisible) : false
}

function blockVisible(block: SopBlock): boolean {
  if (block.type === 'paragraph') return block.runs.some(runVisible)
  return block.items.some(itemVisible)
}

function stepVisible(step: SopStep): boolean {
  return step.blocks.some(blockVisible)
}

function partVisible(part: SopPart): boolean {
  return part.steps.some(stepVisible)
}

function phaseVisible(phase: SopPhase): boolean {
  return phase.parts.some(partVisible)
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

function runMatches(run: SopRun): boolean {
  return runVisible(run) && matchesSearch(run.text)
}

function itemMatches(item: SopListItem): boolean {
  if (item.runs.some(runMatches)) return true
  return item.children ? item.children.items.some(itemMatches) : false
}

function blockMatches(block: SopBlock): boolean {
  if (block.type === 'paragraph') return block.runs.some(runMatches)
  return block.items.some(itemMatches)
}

function stepMatches(step: SopStep): boolean {
  return step.blocks.some((b) => blockVisible(b) && blockMatches(b))
}

function phaseMatches(phase: SopPhase): boolean {
  if ((phase.description ?? []).some(runMatches)) return true
  return phase.parts.some((p) => p.steps.some(stepMatches))
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
  if (searchQuery.value.trim()) return phaseMatches(phase)
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

// ── Pre-game visible blocks ───────────────────────────────────────────────────

const visiblePreGameBlocks = computed(() =>
  props.content.pre_game.blocks.filter((b) => blockVisible(b) && blockMatches(b)),
)

// ── Player badge styling ──────────────────────────────────────────────────────

function playerBadge(player: SopStep['player']): string {
  switch (player) {
    case 'A':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
    case 'D':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400'
    case 'B':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    default:
      return ''
  }
}
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
          class="absolute right-0 top-full mt-1 z-50 w-72 rounded-md border border-border bg-popover shadow-md"
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
                      :checked="!isGroupHidden(group)"
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
                      class="flex items-center gap-2 px-1 py-0.5 rounded hover:bg-accent/50"
                    >
                      <span class="flex-1 text-sm select-none">
                        {{ topic.label }}
                        <span class="text-xs text-muted-foreground ml-1">{{ topic.ref }}</span>
                      </span>
                      <button
                        class="text-[10px] font-semibold rounded border px-1.5 py-0.5 leading-none shrink-0"
                        :class="{
                          'border-border text-muted-foreground': topicState(topic.slug) === 'normal',
                          'border-primary text-primary bg-primary/10': topicState(topic.slug) === 'bold',
                          'border-border bg-muted text-muted-foreground line-through':
                            topicState(topic.slug) === 'hidden',
                        }"
                        :data-topic="topic.slug"
                        :data-state="topicState(topic.slug)"
                        @click="cycleTopic(topic.slug)"
                      >
                        {{ topicState(topic.slug) }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div class="pt-2 border-t border-border mt-1">
              <button
                class="w-full h-8 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                @click="saveTopics"
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
      v-if="visiblePreGameBlocks.length > 0"
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

      <div v-if="preGameExpanded || searchQuery.trim()" class="px-4 py-3 space-y-3">
        <template v-for="(block, bi) in visiblePreGameBlocks" :key="bi">
          <p v-if="block.type === 'paragraph'" class="text-sm text-foreground/90">
            <template v-for="(run, ri) in block.runs" :key="ri">
              <template v-if="runVisible(run)">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <strong v-if="runBold(run)" v-html="renderContent(run.text)" />
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span v-else v-html="renderContent(run.text)" />
              </template>
            </template>
          </p>
          <SopListBlock v-else :list="block" :ignored-tags="localIgnored" :bold-tags="localBold" />
        </template>
      </div>
    </div>

    <!-- Phases -->
    <div
      v-for="phase in props.content.phases.filter(phaseVisible)"
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

      <!-- Phase body -->
      <div v-if="isPhaseExpanded(phase)" class="divide-y divide-border">
        <!-- Description -->
        <div v-if="(phase.description ?? []).some(runVisible)" class="px-4 py-3">
          <p class="text-sm text-foreground/90">
            <template v-for="(run, ri) in phase.description" :key="ri">
              <template v-if="runVisible(run)">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <strong v-if="runBold(run)" v-html="renderContent(run.text)" />
                <!-- eslint-disable-next-line vue/no-v-html -->
                <span v-else v-html="renderContent(run.text)" />
              </template>
            </template>
          </p>
        </div>

        <!-- Parts -->
        <template v-for="part in phase.parts.filter(partVisible)" :key="part.slug">
          <div class="px-4 py-3">
            <p
              class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2"
            >
              {{ part.label }}
            </p>

            <div class="space-y-3">
              <template v-for="step in part.steps.filter(stepVisible)" :key="step.mpath">
                <div v-if="stepMatches(step)" class="space-y-1.5">
                  <div class="flex items-start gap-2 text-sm">
                    <span
                      class="shrink-0 font-mono text-xs text-muted-foreground w-10 text-right pt-0.5"
                      >{{ step.mpath }}</span
                    >
                    <span
                      v-if="step.player"
                      class="shrink-0 text-[10px] font-bold rounded px-1 py-0.5 leading-none mt-0.5"
                      :class="playerBadge(step.player)"
                      >{{ step.player }}</span
                    >
                  </div>

                  <div class="space-y-1.5">
                    <template v-for="(block, bi) in step.blocks" :key="bi">
                      <template v-if="blockVisible(block) && blockMatches(block)">
                        <p v-if="block.type === 'paragraph'" class="text-sm text-foreground/90">
                          <template v-for="(run, ri) in block.runs" :key="ri">
                            <template v-if="runVisible(run)">
                              <!-- eslint-disable-next-line vue/no-v-html -->
                              <strong v-if="runBold(run)" v-html="renderContent(run.text)" />
                              <!-- eslint-disable-next-line vue/no-v-html -->
                              <span v-else v-html="renderContent(run.text)" />
                            </template>
                          </template>
                        </p>
                        <SopListBlock
                          v-else
                          :list="block"
                          :ignored-tags="localIgnored"
                          :bold-tags="localBold"
                        />
                      </template>
                    </template>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>

    <p
      v-if="
        props.content.phases.filter(phaseVisible).length === 0 &&
        visiblePreGameBlocks.length === 0
      "
      class="text-sm text-muted-foreground italic"
    >
      No sequence of play data available.
    </p>
  </div>
</template>
