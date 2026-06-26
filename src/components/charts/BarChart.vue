<script setup lang="ts">
// BarChart — a thin Chart.js bar-chart wrapper (uses the shared registration in
// src/lib/chart.ts). Reads colours from the CSS design tokens so it stays on-brand.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart } from '@/lib/chart'

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    data: number[]
    height?: number
  }>(),
  { height: 200 },
)

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: InstanceType<typeof Chart> | null = null

function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function build() {
  if (!canvas.value) return
  const leaf = token('--color-leaf-400', '#49b2a1')
  const grid = token('--color-grey-200', '#f4f5f6')
  const axis = token('--color-grey-600', '#70767b')

  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets: [{ data: props.data, backgroundColor: leaf, borderRadius: 3, maxBarThickness: 18 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: axis, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
        },
        y: {
          beginAtZero: true,
          grid: { color: grid },
          border: { display: false },
          ticks: { color: axis, font: { size: 10 }, maxTicksLimit: 4 },
        },
      },
    },
  })
}

onMounted(build)
onBeforeUnmount(() => chart?.destroy())

// Re-render when the data changes (e.g. filters update the series).
watch(
  () => [props.labels, props.data],
  () => {
    if (!chart) return
    chart.data.labels = props.labels
    chart.data.datasets[0].data = props.data
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
