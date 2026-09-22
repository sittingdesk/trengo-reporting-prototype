<script setup lang="ts">
// LineChart — a thin Chart.js line-chart wrapper (uses the shared registration in
// src/lib/chart.ts). Reads colours from the CSS design tokens so it stays on-brand.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, CHART_HEIGHT } from '@/lib/chart'

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    series: { name: string; tint: 'leaf' | 'purple'; data: number[]; dashed?: boolean }[]
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
  // leaf-800 + purple-600. Three pairs have shipped here; this is why this one holds.
  //
  // The original leaf-500 + sky-600 looked fine and wasn't: 13° apart in hue, ΔE2000 21.9
  // in normal vision but 10.7 under deuteranopia — two lines that become shades of one
  // violet for roughly 8% of men. Then sun-800 and peach-600, both of which measured ~50
  // and both of which were rejected on sight for being warm.
  //
  // The reason warm kept coming up is structural, not aesthetic: red-green colour blindness
  // collapses hue onto a single blue-to-yellow axis, so a mid teal's only reliable partners
  // lie in the yellow/orange/coral direction. Against leaf-500, purple-600 measures a poor
  // ΔE 14.8 under protanopia for exactly that reason.
  //
  // What breaks the deadlock is LIGHTNESS. Dichromats lose hue, not luminance — so pairing
  // purple-600 with a teal dark enough to be told apart on brightness alone works where the
  // mid teal failed. leaf-800 (#054037, 11.70:1) against purple-600 (#a965d3, 3.83:1)
  // measures ΔE 43.4 normal and never drops below 39.4 across deuteranopia, protanopia and
  // tritanopia. Roughly four times the pair this started with, with no warm colour, and
  // ΔE 33.1 clear of error-600 — so unlike coral it can never read as a judgement.
  //
  // ⚠️ Don't "restore" leaf-500 here. The dark stop is not a style choice; it is the entire
  // mechanism. leaf-700 + purple-600 still works (32.7); leaf-600 and lighter do not.
  const colors: Record<'leaf' | 'purple', string> = {
    leaf: token('--color-leaf-800', '#054037'),
    purple: token('--color-purple-600', '#a965d3'),
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
