<script setup lang="ts">
// DashboardTab — renders one tab (looked up by the :tabId route param).
//
// A tab shows its template's widgets, in order. Metric-bound widgets render a real
// MetricBox; the remaining (mock) placeholders still show a name + kind tag until
// they're wired to the registry. Charts/tables/histograms render wider.
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from '@/composables/useWorkspace'
import { isMetricWidget, type Widget, type WidgetKind } from '@/config/templates'
import { getMetric } from '@/data/metrics'
import Icon from '@/components/Icon.vue'
import { Button } from '@/components/ui/button'
import MetricBox from '@/components/dashboard/MetricBox.vue'

const route = useRoute()
const router = useRouter()
const { getTab, tabTemplate } = useWorkspace()

const tabId = computed(() => String(route.params.tabId))
const tab = computed(() => getTab(tabId.value))
const template = computed(() => tabTemplate(tabId.value))

// If the tab id doesn't exist (e.g. after a scenario reseed), bounce home.
watch(
  tab,
  (t) => {
    if (!t) router.replace('/')
  },
  { immediate: true },
)

// Friendly labels for the placeholder "kind" tag.
const KIND_LABEL: Record<WidgetKind, string> = {
  value: 'Single value',
  trend: 'Line graph',
  histogram: 'By hour',
  table: 'Table',
  breakdown: 'Breakdown',
  tbd: 'TBD',
}

// 12-column grid — the flexible foundation for later drag/resize. Each widget owns a
// `span` (1–12); resizing = changing that number. Mobile 1-up, tablet 2-up, desktop 12.
const gridClass = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12'

// Default span by metric result type (out of 12): value cards 3 → 4 per row.
const SPAN_BY_TYPE: Record<string, number> = {
  value: 3,
  histogram: 6,
  breakdown: 6,
  donut: 6,
  time_series: 12,
  table: 12,
  funnel: 12,
}
// Default span for (mock) placeholder widgets, by kind.
const SPAN_BY_KIND: Record<WidgetKind, number> = {
  value: 3,
  tbd: 3,
  breakdown: 6,
  histogram: 6,
  trend: 12,
  table: 12,
}
// span → literal responsive classes (Tailwind JIT needs complete literals). Full
// 1–12 set so any per-widget span (incl. future drag/resize) renders.
const SPAN_CLASS: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
  10: 'lg:col-span-10',
  11: 'lg:col-span-11',
  12: 'sm:col-span-2 lg:col-span-12',
}

function spanClass(widget: Widget) {
  const span = isMetricWidget(widget)
    ? (widget.span ?? SPAN_BY_TYPE[getMetric(widget.metricId)?.resultType ?? 'value'] ?? 3)
    : SPAN_BY_KIND[widget.kind] ?? 3
  return SPAN_CLASS[span] ?? 'lg:col-span-3'
}
</script>

<template>
  <!-- Empty template (Understand, …): nothing added yet. -->
  <div
    v-if="tab && template && template.widgets.length === 0"
    class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
  >
    <div class="flex size-12 items-center justify-center rounded-circle bg-grey-200 text-grey-600">
      <Icon name="Grid" :size="22" />
    </div>
    <h2 class="text-base font-semibold text-grey-900">This dashboard is empty</h2>
    <p class="max-w-sm text-sm text-grey-600">
      Add widgets to start tracking the metrics that matter for “{{ tab.name }}”.
    </p>
    <Button variant="secondary" size="sm" class="mt-1">
      <Icon name="Grid" :size="16" />
      Manage widgets
    </Button>
  </div>

  <div v-else-if="tab && template" class="px-8 py-6">
    <div :class="gridClass">
      <template v-for="(widget, i) in template.widgets" :key="i">
        <!-- Real metric widget -->
        <MetricBox
          v-if="isMetricWidget(widget)"
          :metric-id="widget.metricId"
          :class="spanClass(widget)"
        />
        <!-- Mock placeholder (templates not yet wired to the registry) -->
        <article
          v-else
          class="flex min-h-[140px] flex-col rounded-lg border border-grey-300 bg-white p-4"
          :class="spanClass(widget)"
        >
          <header class="mb-1 flex items-start justify-between gap-2">
            <h3 class="text-sm font-semibold text-grey-900">{{ widget.name }}</h3>
            <span class="shrink-0 rounded-full bg-grey-200 px-2 py-0.5 text-xs font-medium text-grey-600">
              {{ KIND_LABEL[widget.kind] }}
            </span>
          </header>
          <div class="mt-2 flex flex-1 items-center justify-center rounded-base border border-dashed border-grey-300 bg-grey-100">
            <span class="text-xs text-grey-400">Metric box coming soon</span>
          </div>
        </article>
      </template>
    </div>
  </div>
</template>
