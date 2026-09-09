<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBottomPanelStore } from '@/stores/bottomPanel'
import { useResizablePanel } from '@/composables/useResizablePanel'
import { ChevronUp, Database, Pin, PinOff, X } from '@lucide/vue'
import UnitDataTab from '@/components/layout/UnitDataTab.vue'

const store = useBottomPanelStore()

// ---------------------------------------------------------------------------
// Register tabs
// ---------------------------------------------------------------------------

onMounted(() => {
  store.registerTab({ id: 'unit-data', label: 'Unit Data', icon: 'database' })
})

// ---------------------------------------------------------------------------
// Height persistence
// ---------------------------------------------------------------------------

const MIN_HEIGHT = 200

const {
  size: panelHeight,
  isDragging,
  startResize: onDragStart,
} = useResizablePanel({
  storageKey: 'panel-bottom-height',
  defaultSize: () => Math.round(window.innerHeight * 0.4),
  min: MIN_HEIGHT,
  max: () => Math.round(window.innerHeight * 0.8),
  direction: 'vertical',
  inverted: true,
})

const clampedHeight = computed(() => {
  const maxPx = Math.round(window.innerHeight * 0.8)
  return Math.max(MIN_HEIGHT, Math.min(panelHeight.value, maxPx))
})
</script>

<template>
  <!--
    Mobile (< lg): floating toggle button when closed; fixed overlay when open.
    Desktop (lg+):
      - Closed: thin toggle bar in flow.
      - Open + pinned: full panel in flow (pushes content up).
      - Open + unpinned: full panel absolute overlay.
  -->

  <!-- Mobile floating button (closed) -->
  <button
    v-if="!store.isOpen"
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex lg:hidden items-center gap-1.5 px-4 py-2 rounded-full bg-card border border-border text-xs text-muted-foreground shadow-lg hover:text-foreground transition-colors"
    @click="store.open()"
  >
    <Database class="w-3.5 h-3.5" />
    Unit Data
  </button>

  <!-- Desktop toggle bar (closed) -->
  <button
    v-if="!store.isOpen"
    class="hidden lg:flex items-center gap-1.5 px-3 h-7 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border bg-card w-full shrink-0"
    @click="store.open()"
  >
    <ChevronUp class="w-3 h-3" />
    <Database class="w-3 h-3" />
    Unit Data
  </button>

  <!-- Open panel -->
  <div
    v-if="store.isOpen"
    :class="[
      'border-t border-border bg-card flex flex-col shrink-0',
      // Mobile: fixed overlay
      'fixed bottom-0 left-0 right-0 z-40',
      // Desktop: override to static (in-flow) when pinned, absolute overlay when unpinned
      store.isPinned
        ? 'lg:static lg:z-auto'
        : 'lg:absolute lg:bottom-0 lg:left-0 lg:right-0 lg:z-30',
    ]"
    :style="{ height: `${clampedHeight}px` }"
  >
    <!-- Resize handle (drag top edge to resize) -->
    <div
      class="h-1 w-full cursor-ns-resize shrink-0 hover:bg-primary/30 transition-colors"
      :class="isDragging ? 'bg-primary/40' : ''"
      @pointerdown="onDragStart"
    />

    <!-- Tab bar -->
    <div class="shrink-0 flex items-center border-b border-border h-9 px-2 gap-1">
      <button
        v-for="tab in store.tabs"
        :key="tab.id"
        :class="[
          'flex items-center gap-1.5 px-3 h-7 rounded text-xs transition-colors',
          store.activeTabId === tab.id
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="store.setActiveTab(tab.id)"
      >
        <Database v-if="tab.icon === 'database'" class="w-3 h-3" />
        {{ tab.label }}
      </button>

      <div class="flex-1" />

      <!-- Pin button (desktop only) -->
      <button
        class="hidden lg:flex w-6 h-6 items-center justify-center rounded transition-colors hover:bg-muted/50"
        :title="store.isPinned ? 'Unpin panel' : 'Pin panel'"
        @click="store.isPinned ? store.unpin() : store.pin()"
      >
        <PinOff v-if="store.isPinned" class="w-3 h-3 text-primary" />
        <Pin v-else class="w-3 h-3 text-muted-foreground" />
      </button>

      <!-- Close button -->
      <button
        class="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-muted/50"
        title="Close panel"
        @click="store.close()"
      >
        <X class="w-3 h-3 text-muted-foreground" />
      </button>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-hidden">
      <UnitDataTab v-if="store.activeTabId === 'unit-data'" />
    </div>
  </div>
</template>
