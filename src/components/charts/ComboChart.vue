<script setup lang="ts">
// ComboChart — one measure as a line over a second as bars, on two y-axes.
//
// Its own component rather than a fourth mode on BarChart, because three things in there
// are hard-wired to a single axis and a single unit: `refLinePlugin` reads `c.scales.y`
// directly, the tooltip formats every series with one `unit` prop, and the legend only
// displays when an `average` series is present. Six live widgets ride on BarChart; adding
// dual-axis branches to all of that to serve one card is how the others break.
//
// No new dependency — Chart.js is the site-wide choice (TECH_FOUNDATION §2) and
// `src/lib/chart.ts` already registers BOTH controllers in one place, so a mixed chart
// needs no registration change at all.
//
// ⚠️ A dual axis lets you imply a correlation by choosing scales, which is why it is used
// here and nowhere else: the bars are not a second finding, they are the WEIGHT of the
// first. A score from three surveys and one from thirty look identical on a bare line, and
// the whole reason the reference design pairs them is so they don't.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, CHART_HEIGHT } from '@/lib/chart'
import { fmtPercent } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    labels: (string | number)[]
    /** The line — a 0–1 rate, drawn on the left axis as a percentage. `null` = no
     *  responses that bucket, so no score: the line bridges it (see `segment` below). */
    score: { name: string; data: (number | null)[] }
    /** The bars — a raw count, drawn on the right axis. */
    volume: { name: string; data: number[] }
    /** Axis captions, as in the reference: "Score %" left, "Surveys" right. */
    scoreLabel?: string
    volumeLabel?: string
    height?: number
    /** Below this many responses a bucket's score is thin evidence (one survey reads 100% or
     *  0%), so its tooltip says so. Not marked on the line: the bars already show how many
     *  surveys sit behind each point, which is the whole reason this chart pairs them. */
    minSample?: number
  }>(),
  { height: CHART_HEIGHT, scoreLabel: 'Score %', volumeLabel: 'Surveys', minSample: 5 },
)

/** Responses in bucket i — the bars' own data, so the tooltip can't disagree with what's
 *  drawn. */
const countAt = (i: number) => props.volume.data[i] ?? 0
const isThin = (i: number) => countAt(i) > 0 && countAt(i) < props.minSample
/** A day with a score but no scored neighbour on either side — a one-day range, or a day
 *  between two empty ones. The line has no points at rest, so with nothing to join it to
 *  this score would draw NOTHING at all. It gets a solid point. */
const hasScore = (i: number) => i >= 0 && i < props.score.data.length && props.score.data[i] !== null
const isIsolated = (i: number) => hasScore(i) && !hasScore(i - 1) && !hasScore(i + 1)

const canvas = ref<HTMLCanvasElement | null>(null)
let chart: InstanceType<typeof Chart> | null = null

function token(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

/**
 * Colour by ROLE, not by `tint`.
 *
 * The chart `tint` union is `'sky' | 'peach'` — two peers, for series that are equals
 * (Created vs Closed, Inbound vs Outbound). These two aren't equals: one is the subject and
 * one is its context. So the line takes leaf-600, the darkest green already used for
 * meaning-carrying text, and the bars take a grey — the same role BarChart's own "Average"
 * comparison series plays, for the same reason: it recedes.
 *
 * Untouched by the palette change that repointed that union away from leaf entirely: this card
 * encodes ROLE, not identity, and a second hue here would claim the bars are a second
 * finding rather than the weight behind the first.
 *
 * The reference draws navy on lavender. There is no navy in the palette and purple isn't
 * reachable from a chart (the tint union would have to widen in four places), so this keeps
 * the reference's STRUCTURE — dark subject, pale context — in tokens we actually have.
 */
function datasets() {
  const line = token('--color-leaf-600', '#177b6b')
  // grey-400, not grey-300. The bars themselves read either way as large areas, but the
  // header legend's swatch is an 8px dot: grey-300 is 1.18:1 on white and effectively
  // invisible at that size, grey-400 is 1.9:1. The dot and the bars have to be the same
  // colour to be telling the truth, so the bars follow the dot rather than the reverse.
  const bars = token('--color-grey-400', '#c6c9cd')
  // A segment that touches a day with no responses. Chart.js marks those points `skip`.
  const bridging = (ctx: any) => ctx.p0.skip || ctx.p1.skip
  return [
    {
      type: 'line' as const,
      label: props.score.name,
      // Chart.js plots the raw numbers; the rate is 0–1, so it is scaled to the 0–100 axis
      // here and turned back into a percentage by the tick and tooltip callbacks.
      data: props.score.data.map((v) => (v === null ? null : v * 100)),
      yAxisID: 'y',
      borderColor: line,
      backgroundColor: line,
      borderWidth: 2,
      tension: 0.35,
      // Monotone, not the default bezier: the default overshoots past the real values
      // between two high days, and on an axis pinned at 100 that overshoot was drawn above
      // 100% — and clipped. Monotone never leaves the range of the points it joins.
      cubicInterpolationMode: 'monotone' as const,
      // A 100% day sits exactly on the plot's top edge; Chart.js clips at that edge, which
      // cut the 2px line and the hollow points in half. Let the line draw a few px past it
      // (the layout padding below makes the room).
      clip: 6,
      // Days with no responses: no point there, and the line BRIDGES them rather than
      // breaking. A plain gap fails on this chart — the line has no points at rest, so a
      // day with data between two empty days would have nothing to connect to and vanish,
      // and a sparse week would fall apart into fragments.
      // The bridge is lighter (grey-400) and dashed, so it reads as "nothing measured
      // here". Dashes mean something else elsewhere in the app — a SECOND series on Created
      // vs closed and Tickets & new contacts — but this is a style change within ONE line,
      // and it's lighter as well, so the two can't be confused.
      spanGaps: true,
      segment: {
        borderColor: (ctx: any) => (bridging(ctx) ? bars : undefined),
        borderDash: (ctx: any) => (bridging(ctx) ? [4, 4] : undefined),
      },
      // No points at rest — except a score with no neighbour to join (see isIsolated), which
      // would otherwise draw nothing. A hollow point for thin days was tried and removed: it
      // isn't a convention anyone reads as "few surveys", nothing explained it, and the bars
      // underneath already say it. Thin days are flagged in the tooltip instead.
      pointRadius: (ctx: any) => (isIsolated(ctx.dataIndex) ? 3 : 0),
      pointHoverRadius: 4,
      // Higher order draws later, i.e. on top. The line is the subject and must never be
      // hidden behind a tall bar.
      order: 0,
    },
    {
      type: 'bar' as const,
      label: props.volume.name,
      data: props.volume.data,
      yAxisID: 'y1',
      backgroundColor: bars,
      borderRadius: 2,
      borderSkipped: 'bottom' as const,
      categoryPercentage: 0.8,
      barPercentage: 0.9,
      // Back to 48 with the card: 72 was raised for one commit while this chart ran full
      // width and 48px bars floated in 134px slots. At span 6 a seven-day range gives 63px
      // slots, so the cap barely binds — but on a one-day range it is the whole bar, and a
      // 72px column for a single point reads as a mistake.
      maxBarThickness: 48,
      order: 1,
    },
  ]
}

function build() {
  if (!canvas.value) return
  const grid = token('--color-grey-200', '#f4f5f6')
  const axis = token('--color-grey-600', '#70767b')

  chart = new Chart(canvas.value, {
    // A bar chart that contains a line dataset — Chart.js's own way of mixing types.
    type: 'bar',
    data: { labels: props.labels, datasets: datasets() },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // Room above the plot for a line or point drawn at 100% (see `clip` on the line).
      layout: { padding: { top: 6 } },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        // Off: the legend lives in the CARD HEADER, top-right, where Created vs closed and
        // Call volume already put theirs. Chart.js's own legend would sit inside the plot
        // and cost the chart ~24px of height that the card can't give back.
        legend: { display: false },
        tooltip: {
          usePointStyle: true,
          padding: 10,
          callbacks: {
            // Two units in one tooltip, so each series formats itself. Without this the
            // score reads "86" beside a survey count of "12" and the % is anyone's guess.
            // `any` to match BarChart's own tooltip callback — Chart.js's TooltipItem
            // generics over a mixed "line" | "bar" chart type don't narrow usefully here.
            // A day with no responses: index mode leaves out a skipped (null) point, so the
            // score line contributes nothing and the BAR's line carries the message —
            // "No surveys" rather than "Surveys: 0" beside a missing score.
            label: (ctx: any) => {
              if (ctx.dataset.yAxisID !== 'y') {
                const n = Number(ctx.parsed.y)
                return n === 0 ? 'No surveys' : `${ctx.dataset.label}: ${n}`
              }
              if (ctx.parsed.y === null || Number.isNaN(ctx.parsed.y)) return 'No surveys'
              return `${ctx.dataset.label}: ${fmtPercent(Number(ctx.parsed.y) / 100)}`
            },
            // On a thin day, the caution goes where someone looks when they question a number.
            afterBody: (items: any[]) => {
              const i = items[0]?.dataIndex
              if (i === undefined || !isThin(i)) return []
              const n = countAt(i)
              return [`Based on ${n} ${n === 1 ? 'survey' : 'surveys'}, too few for a reliable score.`]
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: axis, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        },
        // Left: the score. Pinned 0–100 rather than fitted to the data — a satisfaction
        // line that auto-scales turns an 84→86 wobble into a mountain range, which is the
        // sparkline lie this project removed once already.
        y: {
          position: 'left',
          min: 0,
          max: 100,
          grid: { color: grid },
          border: { display: false },
          title: { display: true, text: props.scoreLabel, color: axis, font: { size: 10 } },
          ticks: {
            color: axis,
            font: { size: 10 },
            maxTicksLimit: 3,
            callback: (v: string | number) => `${v}`,
          },
        },
        // Right: the volume. `drawOnChartArea: false` so the plot keeps ONE set of
        // gridlines — two overlapping grids at different intervals is the thing that makes
        // dual-axis charts unreadable.
        y1: {
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          border: { display: false },
          title: { display: true, text: props.volumeLabel, color: axis, font: { size: 10 } },
          ticks: { color: axis, font: { size: 10 }, maxTicksLimit: 4, precision: 0 },
        },
      },
    },
  })
}

onMounted(build)
onBeforeUnmount(() => chart?.destroy())

watch(
  () => [props.labels, props.score, props.volume],
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
