<script setup lang="ts">
// MetricEmptyState — the one neutral empty state for every metric.
// Copy + icon come from src/data/emptyStates.ts; this only lays them out:
// centered icon chip, quiet title, one-line nudge.
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import { resolveEmptyState, COPY } from '@/data/emptyStates'

const props = defineProps<{ metricId: string }>()

const cfg = computed(() => resolveEmptyState(props.metricId))
</script>

<template>
  <!-- role=status announces the state change; keeps card height, centers content.
       Styling per Figma 6943:24467 — icon chip + 12px semibold title + muted subline. -->
  <div
    role="status"
    class="flex flex-1 flex-col items-center justify-center gap-4 px-3 py-2 text-center"
  >
    <!-- Icon chip: white rounded square with a hairline border -->
    <span class="flex items-center justify-center rounded-base border border-black/10 bg-white p-1.5">
      <Icon :name="cfg.icon" :size="20" class="text-grey-800" aria-hidden="true" />
    </span>

    <div class="flex flex-col items-center gap-1 pb-2">
      <span class="text-xs font-semibold text-grey-800">{{ COPY.empty.title(cfg) }}</span>
      <span class="max-w-[180px] text-xs font-medium text-grey-600">{{ COPY.empty.subline() }}</span>
    </div>
  </div>
</template>
