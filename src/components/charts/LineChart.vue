<script setup lang="ts">
// LineChart — a thin Chart.js line-chart wrapper (uses the shared registration in
// src/lib/chart.ts). Reads colours from the CSS design tokens so it stays on-brand.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, CHART_HEIGHT } from '@/lib/chart'
import { fmtCount } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    /** `prev` — the same series over the previous period, bucket by bucket. Adds a
     *  "· prev. N" to that series' tooltip line and nothing to the plot. */
    series: { name: string; tint: 'sky' | 'peach'; data: number[]; dashed?: boolean; prev?: number[] }[]
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
  // sky-500 + peach-500 — Live chat blue and SMS coral, two swatches straight off the
  // categorical breakdown bars, so every chart in the app now draws from one palette.
  //
  // Five pairs have shipped here. The log is kept because the pattern in it is the useful
  // part: every rejection was aesthetic, every failure was measured, and they are not the
  // same axis.
  //
  //   leaf-500 + sky-600    ΔE 21.9 normal / 10.7 CVD — the original, too close
  //   leaf-500 + sun-800    44.9 / 49.8 — correct, rejected as burnt mustard at scale
  //   leaf-500 + peach-600  52.6 / 48.8 — correct, rejected as too warm
  //   leaf-800 + purple-600 43.4 / 39.4 — correct, rejected as too dark
  //   leaf-300 + purple-500 37.7 /  9.0 — pastel, and a real regression for dichromats
  //   sky-500  + peach-500  52.0 / 55.1 — this one
  //
  // 55.1 is the best worst-case of the lot, and it comes from a pastel pair, which looked
  // impossible two commits ago. The trick was giving up on leaf as one half: a teal's only
  // separable partners are warm, but a light BLUE separates from a coral on the blue-yellow
  // axis that survives red-green colour blindness, so both halves can stay light.
  //
  // ⚠️ Worth knowing before someone "puts the green back": leaf-300 + sky-500 measures
  // ΔE 19.5 in normal vision — closer than the original pair this whole thread set out to
  // fix. Mint and light blue is the one combination to keep away from.
  //
  // Both halves are light (1.60:1 and 2.46:1), so colour is still not the sole identifier:
  // multi-series line charts dash their second series. See the mock.
  const colors: Record<'sky' | 'peach', string> = {
    sky: token('--color-sky-500', '#81d7ff'),
    peach: token('--color-peach-500', '#fe8161'),
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
        tooltip: {
          usePointStyle: true,
          padding: 10,
          callbacks: {
            label: (ctx: any) => {
              const prev = props.series[ctx.datasetIndex]?.prev?.[ctx.dataIndex]
              const prevText = prev == null ? '' : ` · prev. ${fmtCount(prev)}`
              return `${ctx.dataset.label}: ${fmtCount(ctx.parsed.y)}${prevText}`
            },
          },
        },
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
