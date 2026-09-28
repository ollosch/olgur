<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useContentStore } from '@/stores/content'
import MatrixTable from '@/components/game-data/MatrixTable.vue'
import AttributeTable from '@/components/game-data/AttributeTable.vue'
import ModifierList from '@/components/game-data/ModifierList.vue'
import SopViewer from '@/components/game-data/SopViewer.vue'
import ProofreadToggle from '@/components/systems/ProofreadToggle.vue'
import type { MatrixContent } from '@/components/game-data/MatrixTable.vue'
import type { AttributeTableContent } from '@/components/game-data/AttributeTable.vue'
import type { ModifierListContent } from '@/components/game-data/ModifierList.vue'
import type { SopContent } from '@/components/game-data/SopViewer.vue'

type TableContent = MatrixContent | AttributeTableContent | ModifierListContent | SopContent

const route = useRoute()
const contentStore = useContentStore()

const gameDatumId = computed(() => route.params['gameDatumId'] as string)

const gameDatum = computed(
  () => contentStore.allGameData.find((d) => d.id === gameDatumId.value) ?? null,
)

const canProofread = computed(
  (): boolean =>
    gameDatum.value !== null &&
    (contentStore.permissionsFor(gameDatum.value.module_id)?.['content.proofread'] ?? false),
)

const content = computed((): TableContent | null => {
  if (!gameDatum.value) return null
  return gameDatum.value.content as unknown as TableContent
})
</script>

<template>
  <div class="overflow-auto p-6 h-full">
    <!-- Not found -->
    <div v-if="!gameDatum" class="text-sm text-muted-foreground">Table not found.</div>

    <template v-else>
      <div class="flex items-center gap-2 mb-1">
        <h1 class="text-lg font-semibold text-foreground">
          {{ gameDatum.name }}
        </h1>
        <ProofreadToggle v-if="canProofread" entity-type="game_datum" :entity-id="gameDatum.id" />
      </div>
      <p class="text-xs text-muted-foreground mb-6 capitalize">
        {{ gameDatum.type }}
      </p>

      <div v-if="content" :data-rule-context="gameDatum.module_id">
        <MatrixTable
          v-if="gameDatum.type === 'table' && (content as MatrixContent).cells !== undefined"
          :content="content as MatrixContent"
        />
        <AttributeTable
          v-else-if="
            gameDatum.type === 'table' && (content as AttributeTableContent).rows !== undefined
          "
          :content="content as AttributeTableContent"
        />
        <ModifierList
          v-else-if="
            gameDatum.type === 'table' && (content as ModifierListContent).entries !== undefined
          "
          :content="content as ModifierListContent"
        />
        <SopViewer
          v-else-if="gameDatum.type === 'sop'"
          :sop-id="gameDatum.id"
          :content="content as SopContent"
        />
        <div v-else class="text-sm text-muted-foreground italic">Unknown table kind.</div>
      </div>
    </template>
  </div>
</template>
