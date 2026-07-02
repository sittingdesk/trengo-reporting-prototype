<script setup lang="ts">
// MetricSkeleton — loading placeholder for a metric card body.
// variant 'value' → label + value + delta bars; 'graph' → a row of bars.
withDefaults(defineProps<{ variant?: 'value' | 'graph' }>(), { variant: 'value' })

// Static bar heights for the graph skeleton (mirrors the Figma loading state).
const bars = [46, 71, 63, 54, 49, 63, 71, 84, 63]
</script>

<template>
  <div class="flex flex-1 animate-pulse flex-col">
    <template v-if="variant === 'graph'">
      <div class="h-5 w-28 rounded-base bg-grey-200" />
      <div class="mt-auto flex items-end gap-2 pt-3">
        <div
          v-for="(h, i) in bars"
          :key="i"
          class="w-5 rounded-base bg-grey-200"
          :style="{ height: `${h}px` }"
        />
      </div>
    </template>

    <template v-else>
      <div class="h-5 w-28 rounded-base bg-grey-200" />
      <div class="mt-3 h-10 w-40 rounded-base bg-grey-200" />
      <div class="mt-auto h-4 w-32 rounded-base bg-grey-200" />
    </template>
  </div>
</template>
