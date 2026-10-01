<script setup lang="ts">
defineProps<{
  marker: string
  text?: string
}>()
</script>

<template>
  <sup
    v-if="text"
    :data-annotation="text"
    class="text-[9px] ml-0.5 text-primary cursor-help underline decoration-dotted"
    >{{ marker }}</sup
  >
  <sup v-else class="text-[9px] ml-0.5 text-primary">{{ marker }}</sup>
</template>
