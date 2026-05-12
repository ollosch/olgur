<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useContentStore } from '@/stores/content'
import MatrixTable from '@/components/game-data/MatrixTable.vue'
import AttributeTable from '@/components/game-data/AttributeTable.vue'
import ModifierList from '@/components/game-data/ModifierList.vue'
import SopViewer from '@/components/game-data/SopViewer.vue'
import type { MatrixContent } from '@/components/game-data/MatrixTable.vue'
import type { AttributeTableContent } from '@/components/game-data/AttributeTable.vue'
import type { ModifierListContent } from '@/components/game-data/ModifierList.vue'
import type { SopContent } from '@/components/game-data/SopViewer.vue'

type TableContent = MatrixContent | AttributeTableContent | ModifierListContent | SopContent

const route = useRoute()
const contentStore = useContentStore()

const gameDatumId = computed(() => route.params['gameDatumId'] as string)

const gameDatum = computed(() =>
  contentStore.allGameData.find((d) => d.id === gameDatumId.value) ?? null,
)

const content = computed((): TableContent | null => {
  if (!gameDatum.value) return null
  return (gameDatum.value.content as unknown) as TableContent
})
</script>

<template>
  <div class="overflow-auto p-6 h-full">
    <!-- Not found -->
    <div
      v-if="!gameDatum"
      class="text-sm text-muted-foreground"
    >
      Table not found.
    </div>

    <template v-else>
      <h1 class="text-lg font-semibold text-foreground mb-1">
        {{ gameDatum.name }}
      </h1>
      <p class="text-xs text-muted-foreground mb-6 capitalize">
        {{ gameDatum.type }}
      </p>

      <div v-if="content">
        <MatrixTable
          v-if="content.kind === 'matrix'"
          :content="content"
        />
        <AttributeTable
          v-else-if="content.kind === 'attribute_table'"
          :content="content"
        />
        <ModifierList
          v-else-if="content.kind === 'modifier_list'"
          :content="content"
        />
        <SopViewer
          v-else-if="content.kind === 'sop'"
          :content="content"
        />
        <div v-else class="text-sm text-muted-foreground italic">
          Unknown table kind.
        </div>
      </div>
    </template>
  </div>
</template>
