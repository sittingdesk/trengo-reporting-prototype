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
  // leaf-300 + purple-500 — the same two swatches the categorical breakdowns use for
  // WhatsApp and Voice, so the line charts and the bar charts finally read as one palette.
  // Four pairs have shipped here; the history is worth keeping because it explains the
  // dash below, which is not decoration.
  //
  //   leaf-500 + sky-600   ΔE 21.9 normal / 10.7 deuteranopia — the original, too close
  //   leaf-500 + sun-800   49.8 worst-case — correct, rejected as burnt mustard at scale
  //   leaf-500 + peach-600 48.8 worst-case — correct, rejected as too warm
  //   leaf-800 + purple-600 39.4 worst-case — correct, rejected as too dark
  //   leaf-300 + purple-500 37.7 normal / 9.0 PROTANOPIA — this one
  //
  // ⚠️ Read that last line honestly: two light pastels cannot separate for a dichromat.
  // Hue is the only thing telling them apart, red-green colour blindness collapses hue onto
  // one axis, and there is no lightness gap to fall back on — 1.88:1 and 2.11:1 on white.
  // On protanopia this pair is WORSE than the leaf/sky we replaced.
  //
  // Which is why colour is no longer the only identifier. Every multi-series line chart now
  // dashes its second series (`dashed` in the mock), so the two are told apart by pattern
  // first and colour second — the standard answer, and the one WCAG actually asks for:
  // never rely on colour alone, pair it with a second visual cue. Tickets & new contacts
  // has always done this; Created vs closed now does too.
  //
  // The stacked bar (Call volume) has no dash, and leans on stacking order plus the header
  // legend's own ordering instead. That is the weakest case in the app — if it ever needs
  // strengthening, the answer is a pattern fill, not a darker colour.
  const colors: Record<'leaf' | 'purple', string> = {
    leaf: token('--color-leaf-300', '#76ccbe'),
    purple: token('--color-purple-500', '#d999ff'),
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
