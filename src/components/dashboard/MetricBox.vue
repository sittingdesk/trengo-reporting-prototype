<script setup lang="ts">
// MetricBox — the one reusable dashboard unit (TECH_FOUNDATION §3), styled to the
// Figma metric card (node 6873:52244): label + filled info icon, a top-right
// trend delta (arrow coloured, % neutral grey), and a 40px value.
// States: value · histogram · empty/pending · restricted. The delta only shows
// when the prototype "Comparison" toggle is on (§8); its colour respects the
// metric's direction (lower-is-better metrics invert).
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import BarChart from '@/components/charts/BarChart.vue'
import { getMetric } from '@/data/metrics'
import { formatValue } from '@/lib/format'
import { metricValue, filterSignature, rangeDays } from '@/lib/mock'
import { Tooltip } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
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
  return `vs prior ${d} ${d === 1 ? 'day' : 'days'}`
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
  return { pct: `${Math.abs(pct).toFixed(1)}%`, up, down, tone: good ? 'good' : bad ? 'bad' : 'flat' }
})

const showDelta = computed(
  () => metric.value?.resultType === 'value' && metric.value?.status === 'ready' && showComparison.value && !!delta.value,
)

// Pending presentation: 'feature' = active card with a helper line; otherwise
// 'soon' = grayed-out placeholder.
const isFeaturePending = computed(
  () => metric.value?.status === 'pending' && metric.value?.pendingVariant === 'feature',
)
const isSoon = computed(
  () => metric.value?.status === 'pending' && metric.value?.pendingVariant !== 'feature',
)
</script>

<template>
  <article
    v-if="metric"
    class="flex min-h-[112px] flex-col gap-3 rounded-lg border p-5"
    :class="isSoon ? 'border-grey-200 bg-grey-100' : 'border-grey-300 bg-white'"
  >
    <!-- Header: label + info icon (hover for description) · delta top-right -->
    <header class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-1">
        <h3 class="text-sm font-medium" :class="isSoon ? 'text-grey-400' : 'text-grey-600'">{{ metric.label }}</h3>
        <Tooltip :text="metric.caveat">
          <span
            class="flex shrink-0 cursor-default items-center transition-colors hover:text-grey-600"
            :class="isSoon ? 'text-grey-300' : 'text-grey-400'"
          >
            <Icon name="Info" :size="14" />
          </span>
        </Tooltip>
      </div>

      <div
        v-if="showDelta && delta"
        class="flex shrink-0 items-center gap-1"
        :title="periodLabel"
      >
        <Icon
          v-if="delta.up || delta.down"
          :name="delta.up ? 'TrendUp' : 'TrendDown'"
          :size="20"
          :class="{
            'text-leaf-500': delta.tone === 'good',
            'text-error-500': delta.tone === 'bad',
            'text-grey-600': delta.tone === 'flat',
          }"
        />
        <span class="text-sm font-medium text-grey-700">{{ delta.pct }}</span>
      </div>

      <!-- Histogram legend, aligned with the title row -->
      <div
        v-else-if="metric.resultType === 'histogram'"
        class="flex shrink-0 items-center gap-3 text-xs leading-5 text-grey-600"
      >
        <span class="flex items-center gap-1.5"><span class="size-2 rounded-circle bg-leaf-400" /> Today</span>
        <span class="flex items-center gap-1.5"><span class="size-2 rounded-circle bg-grey-300" /> Average</span>
      </div>
    </header>

    <!-- Restricted -->
    <div v-if="metric.status === 'restricted'" class="flex flex-1 flex-col items-center justify-center gap-1 text-center">
      <Icon name="Lock" :size="18" class="text-grey-400" />
      <span class="text-xs text-grey-600">You don't have access</span>
    </div>

    <!-- Pending: feature-gated (e.g. Boards) — active card + helper at the bottom -->
    <div v-else-if="isFeaturePending" class="flex flex-1 flex-col">
      <div class="text-[40px] font-semibold leading-none text-grey-300 tabular-nums">—</div>
      <div class="mt-auto inline-flex items-center gap-1.5 text-xs text-grey-600">
        <Icon name="ChartColumn" :size="14" class="text-grey-400" />
        {{ metric.pendingMessage }}
      </div>
    </div>

    <!-- Pending: available soon — grayed-out placeholder -->
    <div v-else-if="metric.status === 'pending'" class="flex flex-1 items-start">
      <Badge variant="muted">Available soon</Badge>
    </div>

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

    <!-- Value (default) -->
    <div v-else class="text-[40px] font-semibold leading-none text-grey-800 tabular-nums">
      {{ formatted }}
    </div>
  </article>
</template>
