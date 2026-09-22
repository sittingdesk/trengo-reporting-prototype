<script setup lang="ts">
// LineChart — a thin Chart.js line-chart wrapper (uses the shared registration in
// src/lib/chart.ts). Reads colours from the CSS design tokens so it stays on-brand.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, CHART_HEIGHT } from '@/lib/chart'

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    series: { name: string; tint: 'leaf' | 'sun'; data: number[]; dashed?: boolean }[]
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
  // leaf + sun, not leaf + sky. Measured, because the old pair looked fine and wasn't:
  // leaf-500 and sky-600 sit 13° apart in hue and read ΔE2000 21.9 in normal vision, but
  // collapse to 10.7 under deuteranopia — two lines that become shades of one violet for
  // roughly 8% of men. No stop of sky fixes it (leaf-500 + sky-700 is WORSE, ΔE 8.1).
  // sun-800 measures 44.9 normal and never drops below 49.8 across deuteranopia,
  // protanopia and tritanopia, and clears 3:1 on white, which a series colour needs
  // because colour plus the legend is the only thing naming a line.
  //
  // sun rather than peach, which scored a hair better: peach-600 is only ΔE 14.7 from
  // error-600, and a coral series beside a red delta starts to read as a judgement. This
  // app keeps evaluative colour out of charts on purpose — sun is ΔE 31.1 clear of it.
  const colors: Record<'leaf' | 'sun', string> = {
    leaf: token('--color-leaf-500', '#249888'),
    sun: token('--color-sun-800', '#d47b15'),
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
