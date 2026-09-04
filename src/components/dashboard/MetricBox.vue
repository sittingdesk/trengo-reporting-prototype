<script setup lang="ts">
// MetricBox — the one reusable dashboard unit (TECH_FOUNDATION §3).
// Data states: value · histogram · time_series · table · loading · restricted,
// plus one neutral EMPTY state (src/data/emptyStates.ts) rendered by
// MetricEmptyState when there are no events in range (or a metric has no data
// source yet, via `always`). The delta row only exists in the value state.
import { computed, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import BarChart from '@/components/charts/BarChart.vue'
import LineChart from '@/components/charts/LineChart.vue'
import FunnelChart from '@/components/charts/FunnelChart.vue'
import HeatmapChart from '@/components/charts/HeatmapChart.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import DataTable from '@/components/dashboard/DataTable.vue'
import MetricSkeleton from '@/components/dashboard/MetricSkeleton.vue'
import MetricEmptyState from '@/components/dashboard/MetricEmptyState.vue'
import MetricErrorState from '@/components/dashboard/MetricErrorState.vue'
import { getMetric } from '@/data/metrics'
import { resolveEmptyState, COPY } from '@/data/emptyStates'
import { formatValue, fmtDuration } from '@/lib/format'
import { metricValue, filterSignature } from '@/lib/mock'
import { CHART_HEIGHT } from '@/lib/chart'
import { Tooltip } from '@/components/ui/tooltip'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { canExportWidget, exportWidgetCSV } from '@/lib/csvExport'
import { useFilters } from '@/composables/useFilters'
import { useSettings } from '@/composables/useSettings'

const props = defineProps<{ metricId: string }>()

const { dateRange, channelIds, teamIds, comparisonLabel, dateRangeLabel } = useFilters()
const { showEmptyData, forceLoading, forceError, slaEnabled } = useSettings()

const metric = computed(() => getMetric(props.metricId))

// Active break-down. One measure can be grouped several ways (e.g. wait time by team
// vs over time) — that's a per-widget SETTING, not a separate metric, so it lives here
// and would be persisted alongside `span` once dashboards are editable.
const activeDim = ref<string | undefined>(metric.value?.dimensions?.[0]?.id)
watch(metric, (m) => (activeDim.value = m?.dimensions?.[0]?.id))
const dimension = computed(
  () => metric.value?.dimensions?.find((d) => d.id === activeDim.value) ?? null,
)
/** The active break-down decides how this widget renders. */
const resultType = computed(() => dimension.value?.resultType ?? metric.value?.resultType)

// Break-downs live in the ⋯ menu, so the card header stays clean regardless of how
// many a measure declares — no width juggling, and room for more settings later.
const dimensions = computed(() => metric.value?.dimensions ?? [])
/** Active configuration, appended to the title so a tile is self-describing — a
 *  screenshot carries its own definition, and it's the only hint that other views
 *  exist now the control lives in the ⋯ menu. Hidden when there's nothing to choose. */
const activeConfigLabel = computed(() =>
  dimensions.value.length > 1 ? dimension.value?.label : undefined,
)

/** Same capability rule as the widget gate in DashboardTab, one level down: a column
 *  measuring something the workspace can't have is absent, not blank. */
const tableColumns = computed(
  () => sample.value?.table?.columns.filter((c) => c.requires !== 'sla' || slaEnabled.value) ?? [],
)
const showDimensionControl = computed(
  () => dimensions.value.length > 1 && !loading.value && !errored.value,
)

const signature = computed(() => filterSignature(dateRange.value, channelIds.value, teamIds.value))
const sample = computed(() => {
  const m = metric.value
  return m ? metricValue(m, signature.value, dateRange.value, activeDim.value) : null
})

// Brief simulated load on mount + whenever the filter signature changes — shows
// the loading skeleton (prototype only; real widgets fetch on filter change, §4).
// The "Loading" viewing mode (forceLoading) holds the skeleton so it's reviewable.
const autoLoading = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  signature,
  () => {
    autoLoading.value = true
    clearTimeout(timer)
    timer = setTimeout(() => (autoLoading.value = false), 350)
  },
  { immediate: true },
)
const loading = computed(() => forceLoading.value || autoLoading.value)

// Error state. A failed fetch is an UNKNOWN, not a fact — so this branch renders
// before restricted/empty/value, and a broken widget can never fall through to a
// number, a zero, or "no … in this period". Per-widget, so one dead endpoint never
// blanks the page. `failed` is the local flag a real fetch rejection would set.
const failed = ref(false)
const errored = computed(() => forceError.value || failed.value)

// Refetch this one widget. Deliberately does NOT swap in the loading skeleton: that
// would resize the card mid-interaction. The spinner lives in the retry button instead,
// so the feedback sits on the control you clicked and the card never moves.
const retrying = ref(false)
function retry() {
  if (retrying.value) return
  retrying.value = true
  setTimeout(() => {
    retrying.value = false
    failed.value = false // a real refetch would resolve or re-set this
  }, 700)
}

// Body height of this widget when it renders normally — the empty AND error states match
// it so the card keeps its footprint. Without it, switching state visibly rearranges the
// page (the heatmap used to collapse 326px → 184px).
const BODY_HEIGHT: Record<string, number> = {
  // A KPI card's body: 160px card − 2 border − 32 padding − 24 header − 16 gap. Without
  // this an errored KPI sat 12px taller than its healthy row-mates — exactly the case the
  // error state exists for, since endpoints usually fail a few at a time.
  value: 86,
  histogram: CHART_HEIGHT,
  breakdown: CHART_HEIGHT,
  donut: CHART_HEIGHT,
  time_series: CHART_HEIGHT,
  funnel: 248,
  heatmap: 252,
  table: 288,
}
const bodyMinHeight = computed(() =>
  resultType.value ? BODY_HEIGHT[resultType.value] : undefined,
)

const formatted = computed(() => {
  const m = metric.value
  if (!m || !sample.value) return '—'
  // An empty KPI card keeps the card's shape rather than swapping the body for a centred
  // message: an em-dash in the value slot, the reason on the supporting line. Rows can't
  // go ragged, and a "0" card and a "—" card read as siblings instead of two different
  // visual languages sitting next to each other.
  if (emptyValueCard.value) return '—'
  // "No events" demo: counts render a true 0 (zero is a value, not an empty state).
  if (showEmptyData.value && resultType.value === 'value' && m.unit === 'count') {
    return formatValue(0, m.unit)
  }
  return formatValue(sample.value.value, m.unit)
})

// Per-card "More" menu (kebab). Holds Export as CSV (charts/tables) + Remove widget.
const menuOpen = ref(false)

// Per-widget CSV export (chart/table widgets only).
const exportable = computed(() => (metric.value ? canExportWidget(metric.value) && !errored.value : false))
function onExport() {
  menuOpen.value = false
  if (!metric.value || !sample.value) return
  // Export what's on screen: a column hidden by a capability gate must not appear in
  // the file either.
  const exported = sample.value.table
    ? { ...sample.value, table: { ...sample.value.table, columns: tableColumns.value } }
    : sample.value
  exportWidgetCSV(metric.value, exported, {
    channels: channelIds.value.join('+') || 'all',
    teams: teamIds.value.join('+') || 'all',
    rangeLabel: dateRangeLabel.value,
  })
}
// Remove widget — prototype placeholder (widgets come from the template; no removal yet).
function onRemove() {
  menuOpen.value = false
}

// One neutral empty state. `always` (no data source yet) forces empty regardless
// of the mock value. Otherwise: empty when there are no events in range (or the
// Empty viewing mode). Counts are the exception — a true 0 renders as the VALUE 0
// (exact zero only), never the empty state, unless `always`.
type CardState = 'value' | 'empty'
const resolvedState = computed<CardState>(() => {
  const m = metric.value
  if (!m || m.status !== 'ready') return 'value' // restricted renders its own branch
  if (resolveEmptyState(m.id).always) return 'empty'
  const isCount = resultType.value === 'value' && m.unit === 'count'
  const chartTypes = ['value', 'histogram', 'time_series', 'breakdown', 'donut', 'funnel']
  const noEvents =
    showEmptyData.value || (chartTypes.includes(resultType.value ?? '') && sample.value?.value === 0)
  return noEvents && !isCount ? 'empty' : 'value'
})

/** A value card with nothing to show — rendered in place, not swapped out. */
const emptyValueCard = computed(
  () => resultType.value === 'value' && resolvedState.value === 'empty',
)
/** The reason, on the same supporting line the figure and comparison use. */
const emptyLabel = computed(() =>
  metric.value ? COPY.empty.title(resolveEmptyState(metric.value.id)) : '',
)

// A single-line "flow" time series (e.g. Conversations created) can show a delta;
// the two-line Created-vs-closed comparison cannot (ambiguous), nor other charts.
const deltaEligible = computed(() => {
  const m = metric.value
  if (!m) return false
  if (resultType.value === 'value') return true
  return resultType.value === 'time_series' && sample.value?.lines?.length === 1
})

/** Movement smaller than this is noise, not news — below it the delta shows the change
 *  but stays neutral. Previously 0.05%, which made a 0.2% wobble render as a red alarm
 *  and left whole pages with no uncoloured card at all. 5% matches the noise floor the
 *  comparison framework uses for efficiency metrics; per-metric overrides (pipeline value
 *  and win rate are genuinely more volatile) would attach to MetricDef. */
const FLAT_BAND_PCT = 5

// Delta — direction-aware (lower-is-better metrics invert the colour).
const delta = computed(() => {
  const m = metric.value
  const s = sample.value
  if (!m || !s || m.status !== 'ready' || !deltaEligible.value) return null
  const pct = ((s.value - s.previous) / (s.previous || 1)) * 100
  // Arrow direction is a fact at any size; only the JUDGEMENT needs a threshold.
  const up = pct > 0.05
  const down = pct < -0.05
  // One ordered scale over signed change, so every value lands in exactly one band —
  // no gap where a change matches no rule. Positive = moved the good way.
  const signed = m.lowerIsBetter ? -pct : pct
  const tone = m.neutral
    ? 'neutral'
    : signed >= FLAT_BAND_PCT
      ? 'good'
      : signed <= -FLAT_BAND_PCT
        ? 'bad'
        : 'flat'
  return { pct: `${Math.abs(pct).toFixed(1)}%`, up, down, tone }
})

/** leaf-600 rather than leaf-500: at the 12px this renders, leaf-500 is 3.55:1 on white
 *  and fails WCAG AA (leaf-600 is 5.14:1). ⚠️ error-500 is 4.13:1 and also fails, but
 *  it's the only error stop in design.md — fixing it needs a darker token. */
const toneClass = computed(() => {
  switch (delta.value?.tone) {
    case 'good':
      return 'text-leaf-600'
    case 'bad':
      return 'text-error-500'
    default:
      return 'text-grey-600' // flat (too small to matter) and neutral (not ours to judge)
  }
})

// Delta row exists ONLY in the value state (fully hidden in every empty state),
// and not during the "no events" demo (no events → nothing to compare).
const showDelta = computed(
  () =>
    deltaEligible.value &&
    metric.value?.status === 'ready' &&
    resolvedState.value === 'value' &&
    !showEmptyData.value &&
    !!delta.value,
)

// Stacked time-series (Call volume): per-series totals + grand total, folded into the
// header legend so the numbers live with the chart (no separate KPI tiles).
const seriesTotals = computed(() => {
  const lines = sample.value?.lines
  if (!lines) return null
  const items = lines.map((l) => ({
    name: l.name,
    tint: l.tint,
    value: l.data.reduce((a, b) => a + b, 0),
  }))
  return { items, total: items.reduce((a, i) => a + i.value, 0) }
})
const fmtCount = (n: number) => formatValue(n, 'count')

const skeletonVariant = computed<'value' | 'graph' | 'line' | 'donut' | 'funnel' | 'table'>(() => {
  const rt = resultType.value
  if (rt === 'table') return 'table'
  if (rt === 'funnel') return 'funnel'
  if (rt === 'donut') return 'donut'
  if (rt === 'time_series') return 'line'
  if (rt === 'histogram' || rt === 'breakdown' || rt === 'heatmap') return 'graph'
  return 'value'
})
// Match the loading bar count to the real chart (24 by-hour, 4 channels, …).
const skeletonBars = computed(() =>
  skeletonVariant.value === 'graph' ? sample.value?.labels?.length : undefined,
)
</script>

<template>
  <article
    v-if="metric"
    class="group flex min-h-[160px] flex-col justify-between gap-4 overflow-hidden rounded-lg border border-grey-300 bg-white p-4"
  >
    <!-- Header: label + inline info icon · (chart legend) · More menu -->
    <header class="flex items-center gap-2">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <h3 class="truncate text-base font-medium text-grey-700">
          {{ metric.label
          }}<span v-if="activeConfigLabel" class="font-normal text-grey-500">
            · {{ activeConfigLabel }}</span>
        </h3>
        <Tooltip v-if="!loading" :text="dimension?.caveat ?? metric.caveat">
          <span class="flex shrink-0 cursor-default items-center text-grey-400 transition-colors hover:text-grey-600">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="8" fill="currentColor" />
              <circle cx="8" cy="4.6" r="1.1" fill="#fff" />
              <rect x="6.9" y="6.7" width="2.2" height="5" rx="1.1" fill="#fff" />
            </svg>
          </span>
        </Tooltip>
      </div>
      <div
        v-if="resultType === 'histogram' && resolvedState === 'value' && !loading"
        class="flex shrink-0 items-center gap-3 text-xs leading-5 text-grey-600"
      >
        <span class="flex items-center gap-1.5"><span class="size-2 rounded-circle bg-leaf-400" /> Today</span>
        <span class="flex items-center gap-1.5"><span class="size-2 rounded-circle bg-grey-300" /> Average</span>
      </div>
      <!-- Stacked time-series (e.g. Call volume): legend enriched with per-series totals + Total -->
      <div
        v-else-if="resultType === 'time_series' && metric.stacked && resolvedState === 'value' && seriesTotals && !loading"
        class="flex shrink-0 items-center gap-3 text-xs leading-5 text-grey-600"
      >
        <span v-for="item in seriesTotals.items" :key="item.name" class="flex items-center gap-1.5">
          <span class="size-2 rounded-circle" :class="item.tint === 'leaf' ? 'bg-leaf-500' : 'bg-sky-600'" />
          {{ item.name }} <span class="font-semibold tabular-nums text-grey-900">{{ fmtCount(item.value) }}</span>
        </span>
        <span class="flex items-center gap-1.5">Total <span class="font-semibold tabular-nums text-grey-900">{{ fmtCount(seriesTotals.total) }}</span></span>
      </div>
      <div
        v-else-if="resultType === 'time_series' && !metric.stacked && resolvedState === 'value' && sample?.lines && sample.lines.length > 1 && !sample?.legendBelow && !loading"
        class="flex shrink-0 items-center gap-3 text-xs leading-5 text-grey-600"
      >
        <span v-for="l in sample.lines" :key="l.name" class="flex items-center gap-1.5">
          <span class="size-2 rounded-circle" :class="l.tint === 'leaf' ? 'bg-leaf-500' : 'bg-sky-600'" /> {{ l.name }}
        </span>
      </div>

      <!-- More menu (kebab, secondary-button style) -->
      <Popover v-if="!loading" v-model:open="menuOpen">
        <PopoverTrigger as-child>
          <button
            type="button"
            class="inline-flex h-6 w-0 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-grey-300 bg-white text-grey-500 opacity-0 transition-[color,background-color,opacity,width] hover:bg-grey-100 hover:text-grey-700 focus:outline-none focus-visible:w-6 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:w-6 group-hover:opacity-100 data-[state=open]:w-6 data-[state=open]:opacity-100 data-[state=open]:bg-grey-100"
            aria-label="More options"
          >
            <Icon name="MoreHoriz" variant="filled" :size="20" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" class="w-48 p-1">
          <!-- Break down by — same measure, different group-by -->
          <template v-if="showDimensionControl">
            <div class="px-2 pb-1 pt-1.5 text-xs font-semibold text-grey-500">Break down by</div>
            <button
              v-for="d in dimensions"
              :key="d.id"
              type="button"
              class="flex w-full items-center gap-2 rounded-base px-2 py-1.5 text-left text-sm transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
              :class="activeDim === d.id ? 'font-semibold text-grey-900' : 'text-grey-700'"
              @click="activeDim = d.id; menuOpen = false"
            >
              <Icon
                name="Check"
                :size="16"
                class="shrink-0"
                :class="activeDim === d.id ? 'text-leaf-500' : 'text-transparent'"
              />
              {{ d.label }}
            </button>
            <div class="my-1 h-px bg-grey-200" role="separator" />
          </template>

          <button
            v-if="exportable && sample && resolvedState === 'value'"
            type="button"
            class="flex w-full items-center gap-2 rounded-base px-2 py-1.5 text-left text-sm text-grey-900 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
            @click="onExport"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-grey-500" aria-hidden="true">
              <path d="M12 3v12" /><path d="M7 12l5 5 5-5" /><path d="M5 21h14" />
            </svg>
            Export as CSV
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-base px-2 py-1.5 text-left text-sm text-grey-900 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
            @click="onRemove"
          >
            <Icon name="Trash" :size="16" class="shrink-0 text-grey-500" />
            Remove widget
          </button>
        </PopoverContent>
      </Popover>
    </header>

      <!-- Body (per state) — sits 4px under the header -->
      <MetricSkeleton v-if="loading" :variant="skeletonVariant" :bars="skeletonBars" />

      <!-- Error — before every other state, so a failure never reads as data -->
      <MetricErrorState v-else-if="errored" :min-height="bodyMinHeight" :retrying="retrying" @retry="retry" />

      <!-- Restricted -->
      <div v-else-if="metric.status === 'restricted'" class="flex flex-1 flex-col items-center justify-center gap-1 text-center">
        <Icon name="Lock" :size="18" class="text-grey-400" />
        <span class="text-xs text-grey-600">You don't have access</span>
      </div>

      <!-- Empty state (one neutral pattern for every metric) -->
      <MetricEmptyState
        v-else-if="resolvedState !== 'value' && resultType !== 'value'"
        :metric-id="metric.id"
        :min-height="bodyMinHeight"
      />

      <!-- Histogram -->
      <div v-else-if="resultType === 'histogram'" class="flex flex-1 flex-col">
        <BarChart
          v-if="sample?.series && sample?.labels"
          :labels="sample.labels"
          :data="sample.series"
          :average="sample.average"
          :legend="false"
          :height="CHART_HEIGHT"
        />
      </div>

      <!-- Time series — line by default, or stacked bars (e.g. Call volume) -->
      <div v-else-if="resultType === 'time_series'" class="flex flex-1 flex-col">
        <BarChart
          v-if="(metric.stacked || dimension?.viz === 'bar') && sample?.lines && sample?.labels"
          :labels="sample.labels"
          :series="sample.lines"
          :legend="false"
          :stacked="metric.stacked === true"
          :unit="metric.unit === 'seconds' ? 'duration' : 'count'"
          :reference-line="
            sample.referenceValue
              ? { value: sample.referenceValue, label: `Period avg. ${fmtDuration(sample.referenceValue)}` }
              : undefined
          "
          :height="CHART_HEIGHT"
        />
        <LineChart
          v-else-if="sample?.lines && sample?.labels"
          :labels="sample.labels"
          :series="sample.lines"
          :legend="!!sample?.legendBelow"
          legend-position="bottom"
          :height="CHART_HEIGHT"
        />
      </div>

      <!-- Breakdown (bar chart: one bar per category, or two series over time) -->
      <div v-else-if="resultType === 'breakdown'" class="flex flex-1 flex-col">
        <BarChart
          v-if="sample?.labels && (sample?.series || sample?.lines)"
          :labels="sample.labels"
          :data="sample.series"
          :series="sample.lines"
          :legend="false"
          :unit="metric.unit === 'seconds' ? 'duration' : 'count'"
          :show-all-labels="true"
          :height="CHART_HEIGHT"
        />
        <p v-if="metric.footnote" class="mt-2 text-xs text-grey-500">{{ metric.footnote }}</p>
      </div>

      <!-- Donut (share of a total across segments) -->
      <div v-else-if="resultType === 'donut'" class="flex flex-1 flex-col">
        <DonutChart v-if="sample?.donut" :segments="sample.donut" center-label="contacts" :height="CHART_HEIGHT" />
      </div>

      <!-- Heatmap (day of week × hour of day) -->
      <div v-else-if="resultType === 'heatmap'" class="flex flex-1 flex-col">
        <HeatmapChart v-if="sample?.heatmap" :data="sample.heatmap" />
      </div>

      <!-- Funnel (counts per pipeline stage) -->
      <div v-else-if="resultType === 'funnel'" class="flex flex-1 flex-col">
        <FunnelChart v-if="sample?.funnel" :rows="sample.funnel" />
      </div>

      <!-- Table -->
      <div v-else-if="resultType === 'table'" class="flex flex-1 flex-col">
        <DataTable v-if="sample?.table" :columns="tableColumns" :rows="sample.table.rows" />
      </div>

      <!-- Value (default) — number + trend, grouped and bottom-anchored (Figma 6986:72319) -->
      <div v-else class="flex flex-col gap-2">
        <!-- Number + supporting figure share a baseline. At a narrow window the figure
             drops to a second line; the card's min-height already reserves that row, so
             it never pushes the card past its neighbours. -->
        <div class="flex flex-wrap items-baseline gap-x-2">
          <!-- No placeholder glyph when empty: a dash next to "No deals in this period"
               says the same thing twice. The sentence takes the value's place. -->
          <span
            v-if="!emptyValueCard"
            class="whitespace-nowrap text-[36px] font-bold leading-[40px] text-grey-900 tabular-nums"
          >{{ formatted }}</span>
          <!-- Same 12/500 as the comparison line below it: both are supporting detail
               for the number, so they read as one tier rather than two near-identical
               sizes. It's also the type token design.md defines (text-Xs 12/500/16). -->
          <span
            v-if="sample?.secondary && !emptyValueCard"
            class="text-xs font-medium leading-4 text-grey-600 tabular-nums"
          >{{ sample.secondary }}</span>
          <span v-if="emptyValueCard" class="text-xs font-medium leading-4 text-grey-600">{{
            emptyLabel
          }}</span>
        </div>
        <!-- The comparison gets a line to itself, always — so it reads the same on every
             card and keeps its "vs prev." label. -->
        <div v-if="showDelta" class="flex min-w-0 items-center gap-2">
          <div v-if="delta" class="flex min-w-0 items-center gap-2">
            <Icon
              v-if="delta.up || delta.down"
              :name="delta.up ? 'TrendUp' : 'TrendDown'"
              :size="16"
              class="shrink-0"
              :class="toneClass"
            />
            <!-- The "vs prev. N days" label is dropped when a supporting figure shares
                 this line: both together overflow a 4-up card and truncating leaves an
                 ellipsis that reads as breakage. The percentage is the data; the period is
                 in the date picker and repeated on every other card. -->
            <p class="truncate text-xs font-medium leading-4 text-grey-600">
              <span :class="toneClass">{{ delta.pct }}</span>
              {{ ' ' }}{{ comparisonLabel }}
            </p>
          </div>
        </div>
      </div>
  </article>
</template>
