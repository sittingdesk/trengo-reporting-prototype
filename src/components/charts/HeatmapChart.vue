<script setup lang="ts">
// HeatmapChart — day-of-week × hour-of-day grid (7 rows × 24 columns), ported from the
// Voice Reporting V4 "Call distribution" card. Plain divs + design tokens, no chart lib.
//
// Two deliberate departures from the reference:
//  1. Empty cells get a real faint fill (grey-100) instead of the reference's undefined
//     `--surface` token, so a quiet week reads as "complete grid, low activity" rather
//     than a broken widget.
//  2. Discrete intensity steps that the legend actually matches (the reference showed a
//     bucketed legend over a continuous alpha ramp).
import { computed } from 'vue'
import { DAY_LABELS } from '@/lib/mock'

const props = defineProps<{ data: number[][] }>()

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))

/** Colour scale is self-relative: the busiest cell in view is always the darkest. */
const max = computed(() => Math.max(0, ...props.data.flat()))

// Step 0 = no calls; 1–4 = quartiles of the busiest cell. Literal classes (Tailwind JIT).
const STEP_BG = ['bg-grey-100', 'bg-leaf-200', 'bg-leaf-300', 'bg-leaf-400', 'bg-leaf-500']
const STEP_TEXT = ['', 'text-grey-900', 'text-grey-900', 'text-white', 'text-white']

function step(v: number): number {
  if (v <= 0 || max.value <= 0) return 0
  return Math.min(4, Math.max(1, Math.ceil((v / max.value) * 4)))
}
</script>

<template>
  <div class="flex flex-col gap-0.5">
    <!-- Hour axis -->
    <div class="flex items-center gap-0.5">
      <span class="w-9 shrink-0" aria-hidden="true" />
      <span
        v-for="h in HOURS"
        :key="h"
        class="min-w-0 flex-1 text-center text-[10px] font-semibold text-grey-600"
      >{{ h }}</span>
    </div>

    <!-- One row per weekday -->
    <div v-for="(row, d) in data" :key="d" class="flex items-center gap-0.5">
      <span class="w-9 shrink-0 pr-1.5 text-right text-xs font-semibold text-grey-600">
        {{ DAY_LABELS[d] }}
      </span>
      <span
        v-for="(val, h) in row"
        :key="h"
        class="flex h-7 min-w-0 flex-1 items-center justify-center rounded-[3px] text-[10px] font-semibold tabular-nums"
        :class="[STEP_BG[step(val)], STEP_TEXT[step(val)]]"
        :title="`${DAY_LABELS[d]} ${HOURS[h]}:00 — ${val} ${val === 1 ? 'call' : 'calls'}`"
      >{{ val || '' }}</span>
    </div>

    <!-- Legend — the same four steps the cells use -->
    <div class="mt-2 flex items-center justify-end gap-1 pr-1">
      <span class="text-[11px] text-grey-600">Fewer</span>
      <span
        v-for="s in [1, 2, 3, 4]"
        :key="s"
        class="size-4 rounded-[3px]"
        :class="STEP_BG[s]"
        aria-hidden="true"
      />
      <span class="text-[11px] text-grey-600">More</span>
    </div>
  </div>
</template>
