<script setup lang="ts">
// MetricBox — the one reusable dashboard unit (TECH_FOUNDATION §3).
// States: value · histogram · empty/pending · restricted. The period-over-period
// delta only shows when the prototype "Comparison" toggle is on (§8), and its
// colour respects the metric's direction (lower-is-better metrics invert).
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { getMetric } from '@/data/metrics'
import { formatValue, fmtDelta, fmtCount } from '@/lib/format'
import { metricValue, filterSignature } from '@/lib/mock'
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

// Delta (only meaningful for ready value metrics, when toggled on).
const delta = computed(() => {
  const m = metric.value
  const s = sample.value
  if (!m || !s || m.status !== 'ready' || m.resultType !== 'value') return null
  const pct = (s.value - s.previous) / (s.previous || 1)
  const up = pct > 0.0001
  const down = pct < -0.0001
  const good = m.lowerIsBetter ? down : up
  const bad = m.lowerIsBetter ? up : down
  return {
    label: fmtDelta(s.value, s.previous),
    up,
    down,
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
      <div class="text-2xl font-extrabold text-grey-300 tabular-nums">—</div>
      <div class="mt-1 inline-flex items-center gap-1 text-xs text-grey-600">
        <Icon name="Info" :size="12" />
        Not available yet
      </div>
    </div>

    <!-- Histogram -->
    <div v-else-if="metric.resultType === 'histogram'" class="flex flex-1 flex-col">
      <div class="mb-2 text-2xl font-extrabold text-grey-900 tabular-nums">{{ seriesTotal }}</div>
      <BarChart
        v-if="sample?.series && sample?.labels"
        :labels="sample.labels"
        :data="sample.series"
        :height="180"
      />
    </div>

    <!-- Value (default) -->
    <div v-else class="mt-auto flex items-end justify-between gap-2">
      <div class="text-2xl font-extrabold text-grey-900 tabular-nums">{{ formatted }}</div>
      <span
        v-if="showComparison && delta"
        class="mb-0.5 inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-xs font-semibold"
        :class="{
          'bg-leaf-100 text-leaf-700': delta.tone === 'good',
          'bg-error-bg text-error-500': delta.tone === 'bad',
          'bg-grey-200 text-grey-600': delta.tone === 'flat',
        }"
      >
        <Icon v-if="delta.up" name="ChevronUp" :size="12" />
        <Icon v-else-if="delta.down" name="ChevronDown" :size="12" />
        {{ delta.label }}
      </span>
    </div>
  </article>
</template>
