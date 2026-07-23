<script setup lang="ts">
// MetricSkeleton — loading placeholder for a metric card BODY only.
// The card header (label + info icon) is always rendered by MetricBox, so the
// skeleton never repeats the label. Variants mirror each result type:
//   value → value + delta bars · graph → a row of bars · line → line paths ·
//   funnel → horizontal rows · table → header + rows.
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'value' | 'graph' | 'line' | 'donut' | 'funnel' | 'table'
    bars?: number
  }>(),
  { variant: 'value' },
)

// Bar heights for the graph skeleton — match the real chart's bar count when known
// (24 for by-hour, 4 for channel bars, …); otherwise a Figma-like default row.
const DEFAULT_BARS = [46, 71, 63, 54, 49, 63, 71, 84, 63]
const barHeights = computed(() => {
  if (!props.bars) return DEFAULT_BARS
  return Array.from({ length: props.bars }, (_, i) => 40 + Math.round(44 * Math.abs(Math.sin(i * 1.3))))
})
// Relative cell widths per table row (fractions of the row).
const cells = ['w-2/5', 'w-1/5', 'w-1/5', 'w-1/6']
</script>

<template>
  <div class="flex flex-1 animate-pulse flex-col">
    <!-- Graph: a row of bars pinned to the bottom (count matches the real chart) -->
    <template v-if="variant === 'graph'">
      <div class="mt-auto flex items-end gap-1.5 pt-3">
        <div
          v-for="(h, i) in barHeights"
          :key="i"
          class="min-w-1 flex-1 rounded-base bg-grey-200"
          :style="{ height: `${h}px` }"
        />
      </div>
    </template>

    <!-- Donut: a centered pulsing ring -->
    <template v-else-if="variant === 'donut'">
      <div class="flex flex-1 items-center justify-center">
        <div class="size-32 rounded-circle border-[16px] border-grey-200" />
      </div>
    </template>

    <!-- Funnel: stacked horizontal bar rows -->
    <template v-else-if="variant === 'funnel'">
      <div class="flex flex-1 flex-col justify-center gap-2.5">
        <div v-for="(w, i) in ['w-full', 'w-4/5', 'w-3/5', 'w-2/5', 'w-1/4']" :key="i" class="flex items-center gap-3">
          <div class="h-3 w-20 shrink-0 rounded-base bg-grey-200" />
          <div class="h-7 rounded-base bg-grey-200" :class="w" />
        </div>
      </div>
    </template>

    <!-- Line: two faint polylines echoing the two-series line chart -->
    <template v-else-if="variant === 'line'">
      <div class="mt-auto pt-3">
        <svg
          class="h-[180px] w-full"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline
            points="0,30 14,24 28,27 42,16 56,20 70,10 84,14 100,6"
            fill="none"
            stroke="var(--color-grey-300)"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
          <polyline
            points="0,36 14,33 28,34 42,29 56,31 70,26 84,28 100,23"
            fill="none"
            stroke="var(--color-grey-200)"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    </template>

    <!-- Table: a thin header row + several data rows -->
    <template v-else-if="variant === 'table'">
      <div class="flex gap-4 border-b border-grey-200 pb-2.5">
        <div v-for="(w, i) in cells" :key="i" class="h-3 rounded-base bg-grey-200" :class="w" />
      </div>
      <div v-for="r in 5" :key="r" class="flex gap-4 border-b border-grey-100 py-2.5">
        <div v-for="(w, i) in cells" :key="i" class="h-4 rounded-base bg-grey-200" :class="w" />
      </div>
    </template>

    <!-- Value: the big number + a delta line -->
    <template v-else>
      <div class="h-10 w-40 rounded-base bg-grey-200" />
      <div class="mt-auto h-4 w-32 rounded-base bg-grey-200" />
    </template>
  </div>
</template>
