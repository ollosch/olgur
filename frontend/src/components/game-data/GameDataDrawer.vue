<script setup lang="ts">
import { ref, computed } from 'vue'
import { useResizablePanel } from '@/composables/useResizablePanel'
import { loadBool, saveItem } from '@/lib/storage'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import GameDataDrawerContent from '@/components/game-data/GameDataDrawerContent.vue'
import type { DrawerMode } from '@/components/game-data/GameDataDrawerContent.vue'

export type { DrawerMode }

const props = defineProps<{
  open: boolean
  mode: DrawerMode
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:mode': [value: DrawerMode]
}>()

// ── Pinning ────────────────────────────────────────────────────────────────────

const PIN_KEY = 'panel-right-pinned'

const isPinned = ref(loadBool(PIN_KEY, false))

function togglePin(): void {
  isPinned.value = !isPinned.value
  saveItem(PIN_KEY, String(isPinned.value))
  if (isPinned.value) {
    emit('update:open', false)
  }
}

// ── Right panel resize ────────────────────────────────────────────────────────

const {
  size: drawerWidth,
  isDragging,
  startResize: onDragStart,
} = useResizablePanel({
  storageKey: 'panel-right-width',
  defaultSize: 600,
  min: 320,
  max: 1200,
  direction: 'horizontal',
  inverted: true,
})

const drawerStyle = computed(() => ({
  width: `min(90vw, ${drawerWidth.value}px)`,
  maxWidth: 'none',
}))

const pinnedStyle = computed(() => ({
  width: `${drawerWidth.value}px`,
  minWidth: `${drawerWidth.value}px`,
}))
</script>

<template>
  <!-- ── Pinned: inline static panel ───────────────────────────────────────── -->
  <div
    v-if="isPinned"
    class="shrink-0 h-full border-l border-border flex flex-col relative bg-background"
    :style="pinnedStyle"
  >
    <GameDataDrawerContent
      :mode="props.mode"
      :is-pinned="true"
      :is-dragging="isDragging"
      @update:mode="emit('update:mode', $event)"
      @toggle-pin="togglePin"
      @drag-start="onDragStart"
    />
  </div>

  <!-- ── Floating sheet (unpinned) ─────────────────────────────────────────── -->
  <Sheet v-else :open="props.open" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="sm:max-w-none flex flex-col p-0 gap-0" :style="drawerStyle">
      <GameDataDrawerContent
        :mode="props.mode"
        :is-pinned="false"
        :is-dragging="isDragging"
        @update:mode="emit('update:mode', $event)"
        @toggle-pin="togglePin"
        @drag-start="onDragStart"
      />
    </SheetContent>
  </Sheet>
</template>
