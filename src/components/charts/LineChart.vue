<script setup lang="ts">
// LineChart — a thin Chart.js line-chart wrapper (uses the shared registration in
// src/lib/chart.ts). Reads colours from the CSS design tokens so it stays on-brand.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, CHART_HEIGHT } from '@/lib/chart'
import type { SeriesTint } from '@/lib/mock'
import { fmtCount } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    /** `prev` — the same series over the previous period, bucket by bucket. Adds a
     *  "· prev. N" to that series' tooltip line and nothing to the plot. */
    series: { name: string; tint: SeriesTint; data: number[]; dashed?: boolean; prev?: number[] }[]
    legend?: boolean
    legendPosition?: 'top' | 'bottom'
    height?: number
    /** What the x-axis prints for a label ('' prints nothing there). The tooltip keeps the
     *  full label, so a label can say "Jun 17 – Jun 21" while the axis says "Jun 17". */
    tickLabel?: (label: string) => string
    /** false: every label is considered and `tickLabel` alone decides which print — for
     *  hourly, where auto-skipping would land on arbitrary hours. */
    tickAutoSkip?: boolean
    /** Points that hold less than a full bucket (a short week at the edge of the range),
     *  with the note the tooltip shows, e.g. "Short week: 2 of 7 days". The line into and
     *  out of such a point is drawn faded, so a short week's lower total doesn't read as a
     *  drop in tickets. */
    partial?: Record<number, string>
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
  const colors: Record<SeriesTint, string> = {
    sky: token('--color-sky-500', '#81d7ff'),
    peach: token('--color-peach-500', '#fe8161'),
    purple: token('--color-purple-500', '#d999ff'),
    sun: token('--color-sun-500', '#ffd467'),
  }
  const partial = props.partial ?? {}
  // #rrggbb + alpha. The tokens are hex (index.css), so the faded stroke stays on-palette.
  const faded = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? `${c}59` : c)
  return props.series.map((s) => ({
    label: s.name,
    data: s.data,
    segment: {
      borderColor: (ctx: any) =>
        ctx.p0DataIndex in partial || ctx.p1DataIndex in partial ? faded(colors[s.tint]) : undefined,
    },
    borderColor: colors[s.tint],
    backgroundColor: colors[s.tint],
    borderWidth: 2,
    borderDash: s.dashed ? [6, 4] : [],
    tension: 0.35,
    pointRadius: 0,
    pointHoverRadius: 4,
  }))
}

/** The x-axis ticks, from the current props. Rebuilt on every update, so a switch between
 *  axis modes (Daily ↔ Hourly) can never leave the previous mode's callback behind — that
 *  stale callback once threw mid-draw, which blanked this chart and stopped every other
 *  chart on the page from drawing (Chart.js animates them in one loop). */
function xTicks(axis: string) {
  const map = props.tickLabel
  return {
    color: axis,
    font: { size: 10 },
    maxRotation: 0,
    autoSkip: props.tickAutoSkip !== false,
    maxTicksLimit: props.tickAutoSkip === false ? undefined : 8,
    callback(this: any, value: any) {
      const label = String(this.getLabelForValue(value))
      return map ? map(label) : label
    },
  }
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
            footer: (items: any[]) => (items.length ? (props.partial?.[items[0].dataIndex] ?? '') : ''),
            label: (ctx: any) => {
              const prev = props.series[ctx.datasetIndex]?.prev?.[ctx.dataIndex]
              const prevText = prev == null ? '' : ` · prev. ${fmtCount(prev)}`
              return `${ctx.dataset.label}: ${fmtCount(ctx.parsed.y)}${prevText}`
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: xTicks(axis) },
        y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: axis, font: { size: 10 }, maxTicksLimit: 4 } },
      },
    },
  })
}

onMounted(build)
onBeforeUnmount(() => chart?.destroy())


// One watcher for data AND axis mode, so they always change together in a single update.
watch(
  () => [props.labels, props.series, props.tickLabel, props.tickAutoSkip, props.partial],
  () => {
    if (!chart) return
    chart.data.labels = props.labels
    chart.data.datasets = datasets()
    const x = chart.options.scales?.x as any
    if (x) x.ticks = xTicks(token('--color-grey-600', '#70767b'))
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
