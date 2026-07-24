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
import DonutChart from '@/components/charts/DonutChart.vue'
import DataTable from '@/components/dashboard/DataTable.vue'
import MetricSkeleton from '@/components/dashboard/MetricSkeleton.vue'
import MetricEmptyState from '@/components/dashboard/MetricEmptyState.vue'
import { getMetric } from '@/data/metrics'
import { resolveEmptyState } from '@/data/emptyStates'
import { formatValue } from '@/lib/format'
import { metricValue, filterSignature } from '@/lib/mock'
import { Tooltip } from '@/components/ui/tooltip'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { canExportWidget, exportWidgetCSV } from '@/lib/csvExport'
import { useFilters } from '@/composables/useFilters'
import { useSettings } from '@/composables/useSettings'

const props = defineProps<{ metricId: string }>()

const { dateRange, channelIds, teamIds, comparisonLabel, dateRangeLabel } = useFilters()
const { showComparison, showEmptyData, forceLoading } = useSettings()

const metric = computed(() => getMetric(props.metricId))

const signature = computed(() => filterSignature(dateRange.value, channelIds.value, teamIds.value))
const sample = computed(() => {
  const m = metric.value
  return m ? metricValue(m, signature.value, dateRange.value) : null
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

const formatted = computed(() => {
  const m = metric.value
  if (!m || !sample.value) return '—'
  // "No events" demo: counts render a true 0 (zero is a value, not an empty state).
  if (showEmptyData.value && m.resultType === 'value' && m.unit === 'count') {
    return formatValue(0, m.unit)
  }
  return formatValue(sample.value.value, m.unit)
})

// Per-card "More" menu (kebab). Holds Export as CSV (charts/tables) + Remove widget.
const menuOpen = ref(false)

// Per-widget CSV export (chart/table widgets only).
const exportable = computed(() => (metric.value ? canExportWidget(metric.value) : false))
function onExport() {
  menuOpen.value = false
  if (!metric.value || !sample.value) return
  exportWidgetCSV(metric.value, sample.value, {
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
  const isCount = m.resultType === 'value' && m.unit === 'count'
  const chartTypes = ['value', 'histogram', 'time_series', 'breakdown', 'donut', 'funnel']
  const noEvents =
    showEmptyData.value || (chartTypes.includes(m.resultType) && sample.value?.value === 0)
  return noEvents && !isCount ? 'empty' : 'value'
})

// A single-line "flow" time series (e.g. Conversations created) can show a delta;
// the two-line Created-vs-closed comparison cannot (ambiguous), nor other charts.
const deltaEligible = computed(() => {
  const m = metric.value
  if (!m) return false
  if (m.resultType === 'value') return true
  return m.resultType === 'time_series' && sample.value?.lines?.length === 1
})

// Delta — direction-aware (lower-is-better metrics invert the colour).
const delta = computed(() => {
  const m = metric.value
  const s = sample.value
  if (!m || !s || m.status !== 'ready' || !deltaEligible.value) return null
  const pct = ((s.value - s.previous) / (s.previous || 1)) * 100
  const up = pct > 0.05
  const down = pct < -0.05
  const good = m.lowerIsBetter ? down : up
  const bad = m.lowerIsBetter ? up : down
  return { pct: `${Math.abs(pct).toFixed(1)}%`, up, down, tone: good ? 'good' : bad ? 'bad' : 'flat' }
})

// Delta row exists ONLY in the value state (fully hidden in every empty state),
// and not during the "no events" demo (no events → nothing to compare).
const showDelta = computed(
  () =>
    deltaEligible.value &&
    metric.value?.status === 'ready' &&
    resolvedState.value === 'value' &&
    !showEmptyData.value &&
    showComparison.value &&
    !!delta.value,
)

const skeletonVariant = computed<'value' | 'graph' | 'line' | 'donut' | 'funnel' | 'table'>(() => {
  const rt = metric.value?.resultType
  if (rt === 'table') return 'table'
  if (rt === 'funnel') return 'funnel'
  if (rt === 'donut') return 'donut'
  if (rt === 'time_series') return 'line'
  if (rt === 'histogram' || rt === 'breakdown') return 'graph'
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
    class="group flex min-h-[152px] flex-col justify-between gap-4 overflow-hidden rounded-lg border border-grey-300 bg-white p-4"
  >
    <!-- Header: label + inline info icon · (chart legend) · More menu -->
    <header class="flex items-center gap-2">
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <h3 class="truncate text-base font-medium text-grey-700">{{ metric.label }}</h3>
        <Tooltip v-if="!loading" :text="metric.caveat">
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
        v-if="metric.resultType === 'histogram' && resolvedState === 'value' && !loading"
        class="flex shrink-0 items-center gap-3 text-xs leading-5 text-grey-600"
      >
        <span class="flex items-center gap-1.5"><span class="size-2 rounded-circle bg-leaf-400" /> Today</span>
        <span class="flex items-center gap-1.5"><span class="size-2 rounded-circle bg-grey-300" /> Average</span>
      </div>
      <div
        v-else-if="metric.resultType === 'time_series' && resolvedState === 'value' && sample?.lines && !sample?.legendBelow && !loading"
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
            class="inline-flex size-6 shrink-0 items-center justify-center rounded-sm border border-grey-300 bg-white text-grey-500 opacity-0 transition-[color,background-color,opacity] hover:bg-grey-100 hover:text-grey-700 focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 data-[state=open]:opacity-100 data-[state=open]:bg-grey-100"
            aria-label="More options"
          >
            <Icon name="MoreHoriz" variant="filled" :size="20" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" class="w-44 p-1">
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

      <!-- Restricted -->
      <div v-else-if="metric.status === 'restricted'" class="flex flex-1 flex-col items-center justify-center gap-1 text-center">
        <Icon name="Lock" :size="18" class="text-grey-400" />
        <span class="text-xs text-grey-600">You don't have access</span>
      </div>

      <!-- Empty state (one neutral pattern for every metric) -->
      <MetricEmptyState v-else-if="resolvedState !== 'value'" :metric-id="metric.id" />

      <!-- Histogram -->
      <div v-else-if="metric.resultType === 'histogram'" class="flex flex-1 flex-col">
        <BarChart
          v-if="sample?.series && sample?.labels"
          :labels="sample.labels"
          :data="sample.series"
          :average="sample.average"
          :legend="false"
          :height="200"
        />
      </div>

      <!-- Time series (line) -->
      <div v-else-if="metric.resultType === 'time_series'" class="flex flex-1 flex-col">
        <LineChart
          v-if="sample?.lines && sample?.labels"
          :labels="sample.labels"
          :series="sample.lines"
          :legend="!!sample?.legendBelow"
          legend-position="bottom"
          :height="220"
        />
      </div>

      <!-- Breakdown (bar chart: one bar per category, or two series over time) -->
      <div v-else-if="metric.resultType === 'breakdown'" class="flex flex-1 flex-col">
        <BarChart
          v-if="sample?.labels && (sample?.series || sample?.lines)"
          :labels="sample.labels"
          :data="sample.series"
          :series="sample.lines"
          :legend="false"
          :height="200"
        />
      </div>

      <!-- Donut (share of a total across segments) -->
      <div v-else-if="metric.resultType === 'donut'" class="flex flex-1 flex-col">
        <DonutChart v-if="sample?.donut" :segments="sample.donut" center-label="contacts" :height="200" />
      </div>

      <!-- Funnel (counts per pipeline stage) -->
      <div v-else-if="metric.resultType === 'funnel'" class="flex flex-1 flex-col">
        <FunnelChart v-if="sample?.funnel" :rows="sample.funnel" />
      </div>

      <!-- Table -->
      <div v-else-if="metric.resultType === 'table'" class="flex flex-1 flex-col">
        <DataTable v-if="sample?.table" :columns="sample.table.columns" :rows="sample.table.rows" :initial-rows="sample.table.initialRows" />
      </div>

      <!-- Value (default) — number + trend, grouped and bottom-anchored (Figma 6986:72319) -->
      <div v-else class="flex flex-col gap-2">
        <span class="whitespace-nowrap text-[36px] font-bold leading-[40px] text-grey-900 tabular-nums">{{ formatted }}</span>
        <div v-if="showDelta && delta" class="flex items-center gap-2">
          <Icon
            v-if="delta.up || delta.down"
            :name="delta.up ? 'TrendUp' : 'TrendDown'"
            :size="16"
            :class="{
              'text-leaf-500': delta.tone === 'good',
              'text-error-500': delta.tone === 'bad',
              'text-grey-600': delta.tone === 'flat',
            }"
          />
          <p class="text-xs font-medium leading-4 text-grey-600">
            <span
              :class="{
                'text-leaf-500': delta.tone === 'good',
                'text-error-500': delta.tone === 'bad',
                'text-grey-600': delta.tone === 'flat',
              }"
            >{{ delta.pct }}</span>
            {{ ' ' }}{{ comparisonLabel }}
          </p>
        </div>
      </div>
  </article>
</template>
