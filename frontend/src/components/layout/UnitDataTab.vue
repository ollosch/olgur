<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUnitSelectionStore } from '@/stores/unitSelection'
import UnitBrowserPane from '@/components/layout/UnitBrowserPane.vue'
import type { GameDatum } from '@/types/domain'

const unitSelectionStore = useUnitSelectionStore()

// ── Lifted selected unit state ─────────────────────────────────────────────────

const selectedUnit = ref<GameDatum | null>(null)

// ── Consume pending unit from GlobalSearch ────────────────────────────────────

onMounted(() => {
  const pending = unitSelectionStore.consumePendingUnit()
  if (pending) {
    selectedUnit.value = pending
  }
})
</script>

<template>
  <!-- Always-split layout: left = list, right = detail -->
  <div class="flex h-full overflow-hidden">
    <!-- Left pane: list-only -->
    <div class="flex-1 min-w-0 border-r border-border overflow-hidden flex flex-col">
      <UnitBrowserPane
        mode="list-only"
        :show-compare-button="false"
        @select="selectedUnit = $event"
      />
    </div>

    <!-- Right pane: detail-only -->
    <div class="flex-1 min-w-0 overflow-hidden flex flex-col">
      <UnitBrowserPane
        mode="detail-only"
        :detail-unit="selectedUnit"
        :show-compare-button="false"
      />
    </div>
  </div>
</template>
