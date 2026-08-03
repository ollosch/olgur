<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUnitSelectionStore } from '@/stores/unitSelection'
import { useUnitBrowserStore } from '@/stores/unitBrowser'
import UnitBrowserPane from '@/components/layout/UnitBrowserPane.vue'

const unitSelectionStore = useUnitSelectionStore()

// ── Lifted selected unit state ─────────────────────────────────────────────────
// Backed by the unit browser store so the selection (and the list pane's
// search/filters) survive the Bottom Panel being closed and reopened.

const { selectedUnit } = storeToRefs(useUnitBrowserStore())

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
