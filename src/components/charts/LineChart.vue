<script setup lang="ts">
// LineChart — a thin Chart.js line-chart wrapper (uses the shared registration in
// src/lib/chart.ts). Reads colours from the CSS design tokens so it stays on-brand.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, CHART_HEIGHT } from '@/lib/chart'

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    series: { name: string; tint: 'leaf' | 'peach'; data: number[]; dashed?: boolean }[]
    legend?: boolean
    legendPosition?: 'top' | 'bottom'
    height?: number
  }>(),
  { height: CHART_HEIGHT, legend: true, legendPosition: 'top' },
)

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: InstanceType<typeof Chart> | null = null

function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function datasets() {
  // leaf + peach, not leaf + sky. Measured, because the old pair looked fine and wasn't:
  // leaf-500 and sky-600 sit 13° apart in hue and read ΔE2000 21.9 in normal vision, but
  // collapse to 10.7 under deuteranopia — two lines that become shades of one violet for
  // roughly 8% of men. No stop of sky fixes it (leaf-500 + sky-700 is WORSE, ΔE 8.1).
  //
  // peach-600 measures 52.6 normal and never drops below 48.8 across deuteranopia,
  // protanopia and tritanopia, and clears 3:1 on white — which a series colour needs,
  // because colour plus the legend is the only thing naming a line.
  //
  // sun-800 shipped here for a day and measured just as well (44.9 / 49.8). It came off on
  // sight rather than on numbers: the amber read as burnt mustard wherever it covered real
  // area, and Call volume is a stacked bar where the second series takes about two thirds
  // of the plot. A pair can be correct and still be wrong at scale.
  //
  // ⚠️ THE TRADE, taken deliberately: peach-600 is only ΔE 14.7 from error-600, so a coral
  // series sitting near a red delta can read faintly evaluative — and this app otherwise
  // keeps judgement out of charts entirely. Accepted because the alternatives are worse:
  // every colour-blind-safe partner for a teal is warm (purple-600 collapses to ΔE 14.8
  // under protanopia, sky-700 to 4.4, grey-600 to 10.5), which is not a style constraint
  // but the shape of dichromatic vision — the only axis that survives red-green colour
  // blindness runs blue to yellow. If the evaluative reading ever bites, the fix is to
  // move BOTH series (sky-700 + peach-600 measures 50.5), not to find a cooler partner
  // for leaf. There isn't one.
  const colors: Record<'leaf' | 'peach', string> = {
    leaf: token('--color-leaf-500', '#249888'),
    peach: token('--color-peach-600', '#df694c'),
  }
  return props.series.map((s) => ({
    label: s.name,
    data: s.data,
    borderColor: colors[s.tint],
    backgroundColor: colors[s.tint],
    borderWidth: 2,
    borderDash: s.dashed ? [6, 4] : [],
    tension: 0.35,
    pointRadius: 0,
    pointHoverRadius: 4,
  }))
}

function build() {
  if (!canvas.value) return
  const grid = token('--color-grey-200', '#f4f5f6')
  const axis = token('--color-grey-600', '#70767b')
  const legendText = token('--color-grey-700', '#4d5256')

  chart = new Chart(canvas.value, {
    type: 'line',
    data: { labels: props.labels, datasets: datasets() },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: props.legend,
          position: props.legendPosition,
          align: props.legendPosition === 'bottom' ? 'center' : 'end',
          // Bottom legend draws line samples (usePointStyle:false) so a dashed
          // series is distinguishable in the legend, not just by colour.
          labels:
            props.legendPosition === 'bottom'
              ? { usePointStyle: false, boxWidth: 24, boxHeight: 0, color: legendText, font: { size: 11 } }
              : { usePointStyle: true, pointStyle: 'circle', boxWidth: 6, boxHeight: 6, color: legendText, font: { size: 11 } },
        },
        tooltip: { usePointStyle: true, padding: 10 },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: axis, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
        y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: axis, font: { size: 10 }, maxTicksLimit: 4 } },
      },
    },
  })
}

onMounted(build)
onBeforeUnmount(() => chart?.destroy())

watch(
  () => [props.labels, props.series],
  () => {
    if (!chart) return
    chart.data.labels = props.labels
    chart.data.datasets = datasets()
    chart.update()
  },
  { deep: true },
)
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <canvas ref="canvas" />
  </div>
</template>
