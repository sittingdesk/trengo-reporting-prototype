<script setup lang="ts">
// MetricBox — the one reusable dashboard unit (TECH_FOUNDATION §3).
// States: value · histogram · empty/pending · restricted. The period-over-period
// delta only shows when the prototype "Comparison" toggle is on (§8), and its
// colour respects the metric's direction (lower-is-better metrics invert).
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { getMetric } from '@/data/metrics'
import { formatValue, fmtCount } from '@/lib/format'
import { metricValue, filterSignature, rangeDays } from '@/lib/mock'
import { useFilters } from '@/composables/useFilters'
import { useSettings } from '@/composables/useSettings'

const props = defineProps<{ metricId: string }>()

const { dateRange, channelIds, teamIds } = useFilters()
const { showComparison } = useSettings()

const metric = computed(() => getMetric(props.metricId))

const sample = computed(() => {
  const m = metric.value
  if (!m) return null
  const sig = filterSignature(dateRange.value, channelIds.value, teamIds.value)
  return metricValue(m, sig)
})

const formatted = computed(() =>
  metric.value && sample.value ? formatValue(sample.value.value, metric.value.unit) : '—',
)

// "vs prior N days" — the comparison window matches the current date range.
const periodLabel = computed(() => {
  const d = rangeDays(dateRange.value.start, dateRange.value.end)
  return `prior ${d} ${d === 1 ? 'day' : 'days'}`
})

// Delta (only meaningful for ready value metrics, when toggled on).
const delta = computed(() => {
  const m = metric.value
  const s = sample.value
  if (!m || !s || m.status !== 'ready' || m.resultType !== 'value') return null
  const pct = ((s.value - s.previous) / (s.previous || 1)) * 100
  const up = pct > 0.05
  const down = pct < -0.05
  const good = m.lowerIsBetter ? down : up
  const bad = m.lowerIsBetter ? up : down
  return {
    pct: `${Math.abs(pct).toFixed(1)}%`,
    arrow: up ? '↑' : down ? '↓' : '→',
    tone: good ? 'good' : bad ? 'bad' : 'flat',
  }
})

const seriesTotal = computed(() =>
  sample.value?.series ? fmtCount(sample.value.series.reduce((a, b) => a + b, 0)) : '0',
)
</script>

<template>
  <article
    v-if="metric"
    class="flex min-h-[132px] flex-col rounded-lg border border-grey-300 bg-white p-5"
  >
    <!-- Label row -->
    <header class="mb-2 flex items-start justify-between gap-2">
      <h3 class="text-sm font-semibold text-grey-700">{{ metric.label }}</h3>
      <span
        v-if="metric.caveat"
        class="shrink-0 cursor-help text-grey-400"
        :title="metric.caveat"
      >
        <Icon name="Info" :size="14" />
      </span>
    </header>

    <!-- Restricted -->
    <div v-if="metric.status === 'restricted'" class="flex flex-1 flex-col items-center justify-center gap-1 text-center">
      <Icon name="Lock" :size="18" class="text-grey-400" />
      <span class="text-xs text-grey-600">You don't have access</span>
    </div>

    <!-- Pending / not available -->
    <div v-else-if="metric.status === 'pending'" class="flex flex-1 flex-col justify-center">
      <div class="text-3xl font-extrabold text-grey-300 tabular-nums">—</div>
      <div class="mt-1 inline-flex items-center gap-1 text-xs text-grey-600">
        <Icon name="Info" :size="12" />
        Not available yet
      </div>
    </div>

    <!-- Histogram -->
    <div v-else-if="metric.resultType === 'histogram'" class="flex flex-1 flex-col">
      <div class="mb-2 text-3xl font-extrabold text-grey-900 tabular-nums">{{ seriesTotal }}</div>
      <BarChart
        v-if="sample?.series && sample?.labels"
        :labels="sample.labels"
        :data="sample.series"
        :height="180"
      />
    </div>

    <!-- Value (default) -->
    <div v-else class="mt-auto">
      <div class="text-3xl font-extrabold text-grey-900 tabular-nums">{{ formatted }}</div>
      <div
        v-if="showComparison && delta"
        class="mt-1 text-sm font-medium"
        :class="{
          'text-leaf-600': delta.tone === 'good',
          'text-error-500': delta.tone === 'bad',
          'text-grey-600': delta.tone === 'flat',
        }"
      >
        {{ delta.arrow }} {{ delta.pct }} vs {{ periodLabel }}
      </div>
    </div>
  </article>
</template>
