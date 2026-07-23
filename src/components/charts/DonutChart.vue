<script setup lang="ts">
// DonutChart — a thin Chart.js doughnut wrapper (shared registration in
// src/lib/chart.ts). Reads colours from the CSS design tokens. Shows a centred
// total overlay and a built-in legend.
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart } from '@/lib/chart'
import { fmtCount } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    segments: { label: string; value: number }[]
    centerLabel?: string
    height?: number
  }>(),
  { height: 200, centerLabel: '' },
)

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: InstanceType<typeof Chart> | null = null

const total = computed(() => props.segments.reduce((a, s) => a + s.value, 0))

function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function build() {
  if (!canvas.value) return
  const palette = [token('--color-leaf-400', '#49b2a1'), token('--color-sky-600', '#4fa1c8')]
  const legendText = token('--color-grey-700', '#4d5256')

  chart = new Chart(canvas.value, {
    type: 'doughnut',
    data: {
      labels: props.segments.map((s) => s.label),
      datasets: [
        {
          data: props.segments.map((s) => s.value),
          backgroundColor: props.segments.map((_, i) => palette[i % palette.length]),
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 6,
            boxHeight: 6,
            padding: 14,
            color: legendText,
            font: { size: 11 },
          },
        },
        tooltip: { usePointStyle: true, boxPadding: 4, padding: 10 },
      },
    },
  })
}

onMounted(build)
onBeforeUnmount(() => chart?.destroy())

watch(
  () => props.segments,
  () => {
    if (!chart) return
    chart.data.labels = props.segments.map((s) => s.label)
    chart.data.datasets[0].data = props.segments.map((s) => s.value)
    chart.update()
  },
  { deep: true },
)
</script>

<template>
  <div class="relative" :style="{ height: `${height}px` }">
    <canvas ref="canvas" />
    <!-- Centred total overlay (sits over the ring; legend is at the bottom) -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center justify-center"
      :style="{ height: `${height - 28}px` }"
    >
      <span class="text-2xl font-semibold text-grey-900 tabular-nums">{{ fmtCount(total) }}</span>
      <span v-if="centerLabel" class="text-xs font-medium text-grey-600">{{ centerLabel }}</span>
    </div>
  </div>
</template>
