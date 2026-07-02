<script setup lang="ts">
// BarChart — a thin Chart.js bar-chart wrapper (uses the shared registration in
// src/lib/chart.ts). Reads colours from the CSS design tokens so it stays on-brand.
// Supports an optional second "Average" series drawn beside the primary one.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart } from '@/lib/chart'

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    data?: number[]
    average?: number[]
    // Multi-series grouped bars (overrides data/average when provided).
    series?: { name: string; tint: 'leaf' | 'sky'; data: number[] }[]
    seriesLabel?: string
    averageLabel?: string
    legend?: boolean
    height?: number
  }>(),
  { height: 200, seriesLabel: 'Today', averageLabel: 'Average', legend: true },
)

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: InstanceType<typeof Chart> | null = null

function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function datasets() {
  // Multi-series grouped bars (e.g. Created vs Closed).
  if (props.series) {
    const colors: Record<'leaf' | 'sky', string> = {
      leaf: token('--color-leaf-500', '#249888'),
      sky: token('--color-sky-600', '#4fa1c8'),
    }
    return props.series.map((s) => ({
      label: s.name,
      data: s.data,
      backgroundColor: colors[s.tint],
      borderRadius: 3,
      maxBarThickness: 10,
    }))
  }

  const leaf = token('--color-leaf-400', '#49b2a1')
  const grey = token('--color-grey-300', '#e1e3e5')
  const sets: any[] = [
    { label: props.seriesLabel, data: props.data, backgroundColor: leaf, borderRadius: 3, maxBarThickness: 14 },
  ]
  if (props.average) {
    sets.push({
      label: props.averageLabel,
      data: props.average,
      backgroundColor: grey,
      borderRadius: 3,
      maxBarThickness: 14,
    })
  }
  return sets
}

function build() {
  if (!canvas.value) return
  const grid = token('--color-grey-200', '#f4f5f6')
  const axis = token('--color-grey-600', '#70767b')
  const legendText = token('--color-grey-700', '#4d5256')

  chart = new Chart(canvas.value, {
    type: 'bar',
    data: { labels: props.labels, datasets: datasets() },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: props.legend && !!props.average,
          position: 'top',
          align: 'end',
          labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 6, boxHeight: 6, color: legendText, font: { size: 11 } },
        },
        tooltip: {
          intersect: false,
          mode: 'index',
          usePointStyle: true,
          boxPadding: 4,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: axis, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 24 },
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
  () => [props.labels, props.data, props.average, props.series],
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
