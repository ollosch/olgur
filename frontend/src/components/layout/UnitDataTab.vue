<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { X } from 'lucide-vue-next'
import { useUnitSelectionStore } from '@/stores/unitSelection'
import UnitBrowserPane from '@/components/layout/UnitBrowserPane.vue'
import type { GameDatum } from '@/types/domain'

const unitSelectionStore = useUnitSelectionStore()

// ── Compare mode ──────────────────────────────────────────────────────────────

const compareMode = ref(false)
const paneAInitialUnit = ref<GameDatum | null>(null)
const paneBInitialUnit = ref<GameDatum | null>(null)

function enterCompare(unit: GameDatum): void {
  paneAInitialUnit.value = unit
  paneBInitialUnit.value = null
  compareMode.value = true
}

function exitCompare(): void {
  compareMode.value = false
  paneAInitialUnit.value = null
  paneBInitialUnit.value = null
}

// ── Consume pending unit from GlobalSearch ────────────────────────────────────

const mainInitialUnit = ref<GameDatum | null>(null)

onMounted(() => {
  const pending = unitSelectionStore.consumePendingUnit()
  if (pending) {
    mainInitialUnit.value = pending
  }
})
</script>

<template>
  <!-- Compare mode: two panes side by side -->
  <div v-if="compareMode" class="flex h-full overflow-hidden">
    <!-- Exit compare button -->
    <div class="absolute top-0 right-0 z-10 p-1">
      <button
        class="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded px-2 py-0.5 bg-card transition-colors hover:border-border/80"
        @click="exitCompare"
      >
        <X class="w-3 h-3" />
        Exit compare
      </button>
    </div>

    <!-- Pane A -->
    <div class="flex-1 min-w-0 border-r border-border overflow-hidden flex flex-col">
      <div class="shrink-0 px-3 pt-1.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/50">
        Unit A
      </div>
      <div class="flex-1 overflow-hidden">
        <UnitBrowserPane
          :initial-unit="paneAInitialUnit"
          :show-compare-button="false"
        />
      </div>
    </div>

    <!-- Pane B -->
    <div class="flex-1 min-w-0 overflow-hidden flex flex-col">
      <div class="shrink-0 px-3 pt-1.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/50">
        Unit B
      </div>
      <div class="flex-1 overflow-hidden">
        <UnitBrowserPane
          :initial-unit="paneBInitialUnit"
          :show-compare-button="false"
        />
      </div>
    </div>
  </div>

  <!-- Normal mode: single pane -->
  <div v-else class="h-full overflow-hidden relative">
    <UnitBrowserPane
      :initial-unit="mainInitialUnit"
      :show-compare-button="true"
      @compare="enterCompare"
    />
  </div>
</template>
