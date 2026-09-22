<script setup lang="ts">
// BarChart — a thin Chart.js bar-chart wrapper (uses the shared registration in
// src/lib/chart.ts). Reads colours from the CSS design tokens so it stays on-brand.
// Supports an optional second "Average" series drawn beside the primary one.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, CHART_HEIGHT } from '@/lib/chart'
import { fmtDuration, fmtPercent } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    data?: number[]
    average?: number[]
    // Multi-series grouped bars (overrides data/average when provided).
    series?: { name: string; tint: 'leaf' | 'peach'; data: number[] }[]
    seriesLabel?: string
    averageLabel?: string
    legend?: boolean
    // 'duration' formats the y-axis + tooltip as m/s (values stay raw seconds);
    // 'percentage' takes 0–1 ratios and pins the axis to 0–100% (see the scale below).
    unit?: 'count' | 'duration' | 'percentage'
    /** One extra tooltip line per bar, by index — e.g. the n a rate was computed from.
     *  A rate with no denominator beside it is the thing small samples hide behind. */
    context?: string[]
    // Always render every x-axis label (no auto-skip) and truncate long ones —
    // for categorical bars (e.g. per-team) where every label must show.
    showAllLabels?: boolean
    /** One colour per bar instead of one colour for the series.
     *
     *  ⚠️ Only for a BREAKDOWN, where each bar is a different thing and carries its own
     *  axis label. A bar-rendered TIME SERIES must never set this: its bars are days, and
     *  painting Tuesday purple says something untrue about Tuesday. */
    categorical?: boolean
    // Stack multi-series bars (inbound + outbound = total height) instead of grouping
    // them side-by-side. Only meaningful with `series`.
    stacked?: boolean
    // Dashed horizontal marker (e.g. the period average), drawn across the plot.
    referenceLine?: { value: number; label: string }
    height?: number
  }>(),
  {
    height: CHART_HEIGHT,
    // Only meaningful on the hour-of-day histogram, which pairs it with `average`.
    // Never shown for a single-series chart (see the tooltip callback).
    seriesLabel: 'Today',
    averageLabel: 'Average',
    legend: true,
    unit: 'count',
    showAllLabels: false,
    categorical: false,
    stacked: false,
  },
)

/**
 * The categorical palette, in order, from the DS Foundations chart example.
 *
 * Safe here for one specific reason: in a breakdown every bar sits above its own axis
 * label, so colour DECORATES rather than identifies. It could not carry identity — five
 * hues exceed what dichromatic vision can separate, and sun-500 against peach-500 measures
 * ΔE 5.2 under deuteranopia. The same palette behind a legend-only chart would be
 * unreadable for those viewers; behind labelled bars it costs them nothing.
 *
 * The light stops also run 1.4–2.5:1 on white, under the 3:1 a graphical object needs when
 * it is load-bearing. Same argument: the axis is load-bearing, these are large filled areas,
 * and this project already accepts grey-400 bars at 1.9:1 for the same reason.
 *
 * Five entries covers every breakdown we have (4 channels, 5 teams, 5 ratings). Past five
 * it cycles, which is a hint the widget wants a table rather than more hues.
 */
const CATEGORY_COLORS: [string, string][] = [
  ['--color-leaf-300', '#76ccbe'],
  ['--color-sky-500', '#81d7ff'],
  ['--color-sun-500', '#ffd467'],
  ['--color-purple-500', '#d999ff'],
  ['--color-peach-500', '#fe8161'],
]

// Axis/tooltip value formatter — raw counts, seconds → "1m 20s", or a 0–1 ratio → "84%".
const fmtVal = (v: number | string) =>
  props.unit === 'duration'
    ? fmtDuration(Number(v))
    : props.unit === 'percentage'
      ? fmtPercent(Number(v))
      : String(v)

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: InstanceType<typeof Chart> | null = null

function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function datasets() {
  // Bar width comes from categoryPercentage × barPercentage (fraction of each
  // column slot the bars fill, ~72% like the reference). maxBarThickness is a high
  // cap so a few bars over a wide card still fill the column, not a tight clamp.
  const bar = {
    borderRadius: 2,
    borderSkipped: 'bottom' as const, // round the top corners only
    categoryPercentage: 0.8,
    barPercentage: 0.9,
  }

  // Multi-series grouped bars (e.g. Created vs Closed) — slimmer so the pair fits.
  if (props.series) {
    // leaf + peach — see LineChart for the measurements and the trade. Short version: leaf
    // and sky collapsed to ΔE 10.7 under deuteranopia; leaf and peach never drop below
    // 48.8. This is the chart where it matters most — a stacked bar gives the second
    // series two thirds of the plot area, so its colour is the card's colour.
    const colors: Record<'leaf' | 'peach', string> = {
      leaf: token('--color-leaf-500', '#249888'),
      peach: token('--color-peach-600', '#df694c'),
    }
    return props.series.map((s) => ({
      label: s.name,
      data: s.data,
      backgroundColor: colors[s.tint],
      // Stacked columns are one-per-slot → let them fill wider; grouped stay slim.
      maxBarThickness: props.stacked ? 48 : 18,
      ...bar,
    }))
  }

  const leaf = token('--color-leaf-400', '#49b2a1')
  const grey = token('--color-grey-300', '#e1e3e5')
  // Single-series bars fill the column (high cap); grouped Today/Average stay slim.
  const grouped = !!props.average
  // Chart.js takes an array here and applies it per bar — no plugin needed.
  const fill =
    props.categorical && !grouped
      ? (props.data ?? []).map((_, i) => {
          const [name, fallback] = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
          return token(name, fallback)
        })
      : leaf
  const sets: any[] = [
    { label: props.seriesLabel, data: props.data, backgroundColor: fill, maxBarThickness: grouped ? 18 : 72, ...bar },
  ]
  if (props.average) {
    sets.push({ label: props.averageLabel, data: props.average, backgroundColor: grey, maxBarThickness: 18, ...bar })
  }
  return sets
}

function build() {
  if (!canvas.value) return
  const grid = token('--color-grey-200', '#f4f5f6')
  const axis = token('--color-grey-600', '#70767b')
  const legendText = token('--color-grey-700', '#4d5256')

  // Dashed reference line + right-aligned label. A tiny inline plugin keeps this
  // dependency-free (chartjs-plugin-annotation would be overkill for one line).
  const refLinePlugin = {
    id: 'referenceLine',
    afterDatasetsDraw(c: any) {
      const ref = props.referenceLine
      if (!ref) return
      const y = c.scales.y?.getPixelForValue(ref.value)
      if (y == null || !isFinite(y)) return
      const { left, right } = c.chartArea
      const g = c.ctx
      g.save()
      g.setLineDash([4, 4])
      g.lineWidth = 1
      // grey-600, matching the label it sits under. It asked for grey-500 and, until that
      // token existed, silently fell through to a hardcoded #8a9096 that is on no scale at
      // all. Now that grey-500 resolves it would render at 1.89:1 — under the 3:1 a
      // meaning-carrying graphic needs, and this line IS the meaning.
      g.strokeStyle = token('--color-grey-600', '#70767b')
      g.beginPath()
      g.moveTo(left, y)
      g.lineTo(right, y)
      g.stroke()
      g.setLineDash([])
      g.font = '10px Inter, sans-serif'
      g.fillStyle = token('--color-grey-600', '#70767b')
      g.textAlign = 'right'
      g.textBaseline = 'bottom'
      g.fillText(ref.label, right, y - 3)
      g.restore()
    },
  }

  chart = new Chart(canvas.value, {
    type: 'bar',
    plugins: [refLinePlugin],
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
          callbacks: {
            // Only name the series when there's more than one to tell apart. A single
            // dataset inherited `seriesLabel`'s default and rendered "Today: 195" on
            // every categorical bar — wrong twice over: it isn't today, it's the total
            // for the selected range, and the category is already the tooltip's title.
            label: (ctx: any) => {
              const named = ctx.chart.data.datasets.length > 1 && ctx.dataset.label
              return `${named ? ctx.dataset.label + ': ' : ''}${fmtVal(ctx.parsed.y)}`
            },
            // The denominator, when the caller has one. On a rate chart this is the
            // difference between "62%" and "62% — 5 of 8 responses", i.e. between a
            // finding and noise. Absent by default, so every other chart is unchanged.
            afterLabel: (ctx: any) => props.context?.[ctx.dataIndex] ?? '',
          },
        },
      },
      scales: {
        x: {
          stacked: props.stacked,
          // Faint vertical grid lines (like the production reference).
          grid: { display: true, color: grid, drawTicks: false },
          ticks: {
            color: axis,
            font: { size: 10 },
            maxRotation: 0,
            // Categorical bars show every label + truncate; time buckets auto-skip.
            autoSkip: !props.showAllLabels,
            maxTicksLimit: props.showAllLabels ? undefined : 24,
            // Always resolve the real label (don't leave it as the raw index).
            // In show-all-labels mode, truncate to the width available per label
            // (recomputed on resize); down to a single first letter when that's all
            // that fits. Otherwise return the full label and let autoSkip thin them.
            callback: function (this: any, value: string | number) {
              const l = String(this.getLabelForValue(Number(value)))
              if (!props.showAllLabels) return l
              const n = this.ticks?.length || this.getLabels?.().length || 1
              const per = (this.width || 0) / n
              const maxChars = per > 0 ? Math.max(1, Math.floor(per / 7)) : 12
              if (l.length <= maxChars) return l
              return maxChars <= 1 ? l.slice(0, 1) : l.slice(0, maxChars - 1) + '…'
            },
          },
        },
        y: {
          stacked: props.stacked,
          beginAtZero: true,
          // A percentage axis runs the full 0–100%, always. Let Chart.js fit it to the
          // data and four channels sitting between 78% and 92% draw as a cliff — the
          // same auto-scaling lie the sparkline was removed for, and ComboChart pins its
          // score axis for exactly this reason.
          max: props.unit === 'percentage' ? 1 : undefined,
          grid: { color: grid },
          border: { display: false },
          ticks: {
            color: axis,
            font: { size: 10 },
            maxTicksLimit: 6,
            callback: (v: any) => fmtVal(v),
          },
        },
      },
    },
  })
}

onMounted(build)
onBeforeUnmount(() => chart?.destroy())

// Re-render when the data changes (e.g. filters update the series).
watch(
  () => [props.labels, props.data, props.average, props.series, props.referenceLine],
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
