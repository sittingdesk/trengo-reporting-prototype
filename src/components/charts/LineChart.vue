<script setup lang="ts">
// LineChart — a thin Chart.js line-chart wrapper (uses the shared registration in
// src/lib/chart.ts). Reads colours from the CSS design tokens so it stays on-brand.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart } from '@/lib/chart'

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    series: { name: string; tint: 'leaf' | 'sky'; data: number[] }[]
    legend?: boolean
    height?: number
  }>(),
  { height: 200, legend: true },
)

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: InstanceType<typeof Chart> | null = null

function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function datasets() {
  const colors: Record<'leaf' | 'sky', string> = {
    leaf: token('--color-leaf-500', '#249888'),
    sky: token('--color-sky-600', '#4fa1c8'),
  }
  return props.series.map((s) => ({
    label: s.name,
    data: s.data,
    borderColor: colors[s.tint],
    backgroundColor: colors[s.tint],
    borderWidth: 2,
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
          position: 'top',
          align: 'end',
          labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 6, boxHeight: 6, color: legendText, font: { size: 11 } },
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
