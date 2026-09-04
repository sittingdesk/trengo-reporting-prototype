<script setup lang="ts">
// MetricEmptyState — the one neutral empty state for every metric.
// Copy + icon come from src/data/emptyStates.ts; this only lays them out:
// centered icon chip, quiet title, one-line nudge.
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import { resolveEmptyState, COPY } from '@/data/emptyStates'

// `minHeight` mirrors the widget's normal body height so an empty chart or table keeps
// its footprint — switching data state must not rearrange the page around it.
const props = defineProps<{ metricId: string; minHeight?: number }>()

const cfg = computed(() => resolveEmptyState(props.metricId))
</script>

<template>
  <!-- role=status announces the state change. Only charts, tables and heatmaps reach
       this now — value cards render "—" in their own value slot instead of swapping the
       body out, so a KPI row can't go ragged.
       The Figma chip (a white rounded square with a hairline border, on a white card)
       read as a rendering artifact and was the largest thing in the card while carrying
       nothing the title doesn't; the icon stands on its own. -->
  <div
    role="status"
    class="flex flex-1 flex-col items-center justify-center gap-3 px-3 py-2 text-center"
    :style="minHeight ? { minHeight: `${minHeight}px` } : undefined"
  >
    <Icon :name="cfg.icon" :size="20" class="text-grey-600" aria-hidden="true" />
    <span class="text-xs font-semibold text-grey-800">{{ COPY.empty.title(cfg) }}</span>
  </div>
</template>
