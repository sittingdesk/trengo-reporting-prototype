<script setup lang="ts">
// WidgetGrid — renders one report's widgets, in order, on the 12-column grid.
//
// Pure: it takes the widget list as a prop and knows nothing about routes or
// dashboards. Metric-bound widgets render a real MetricBox; the remaining (mock)
// placeholders still show a name + kind tag until they're wired to the registry.
import { computed } from 'vue'
import { useSettings } from '@/composables/useSettings'
import { isMetricWidget, type Widget, type WidgetKind } from '@/config/templates'
import { getMetric } from '@/data/metrics'
import Icon from '@/components/Icon.vue'
import { Button } from '@/components/ui/button'
import MetricBox from '@/components/dashboard/MetricBox.vue'

const props = withDefaults(
  defineProps<{
    widgets: Widget[]
    /** Only used in the empty-report copy. */
    reportName: string
    /** Edit mode: cards expose a remove control and an "Add widget" tile appears. */
    editing?: boolean
    /** Whether editing is possible at all — false on Trengo, which hides the way in. */
    canEdit?: boolean
  }>(),
  { editing: false, canEdit: false },
)

const emit = defineEmits<{ remove: [widget: Widget]; edit: [] }>()

const { slaEnabled } = useSettings()

// Capability gate. A metric that `requires` a feature the workspace doesn't have is
// omitted from the page entirely — not greyed out, not empty. Without an SLA policy
// there is no target, so there is nothing to measure: an empty "SLA compliance" card
// would be claiming we looked and found nothing, which is the same lie the error state
// exists to prevent. Widgets are filtered here, so the grid simply reflows.
const visible = computed(() =>
  props.widgets.filter((w) => {
    if (!isMetricWidget(w)) return true
    const requires = getMetric(w.metricId)?.requires
    return requires !== 'sla' || slaEnabled.value
  }),
)

/** Stable key so toggling a capability re-creates cards rather than re-using a
 *  MetricBox (and its break-down / retry state) for a different metric. */
function widgetKey(widget: Widget, i: number) {
  return isMetricWidget(widget) ? widget.metricId : `${widget.name}-${i}`
}

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
// `span` (1–12); resizing = changing that number. Tiers: mobile 1-up · tablet (6-col)
// span-aware — KPI-sized cards 3-up, chart/table-sized full-width, so rows always fill
// with no stray holes · desktop full 12-col spans.
// items-start: tiles keep their natural height (value cards don't stretch to a taller
// chart neighbour), so KPI cards stay a consistent height across rows.
const gridClass = 'grid grid-cols-1 items-start gap-4 sm:grid-cols-6 lg:grid-cols-12'

// Default span by metric result type (out of 12). Value cards default to 3 → 4-up KPI
// rows: ONE card width across every page, so a KPI is the same size wherever you meet
// it and the snap targets stay predictable once widgets can be dragged and resized.
// Rows aren't guaranteed to fill — a trailing gap is deliberate, and it's where
// "+ Add widget" will live. Set a per-widget `span` to override (also the future
// drag-resize hook).
const SPAN_BY_TYPE: Record<string, number> = {
  value: 3,
  histogram: 6,
  breakdown: 6,
  donut: 6,
  time_series: 12,
  table: 12,
  funnel: 12,
  heatmap: 12, // 24 hour columns need the full row
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
// 1–12 set so any per-widget span (incl. future drag/resize) renders. Tablet (sm,
// 6-col grid) derives a fitting width from the span so rows fill with no holes:
// span 3 (quarters, 4-up groups) → halves (2×2); span 4 (thirds) → thirds;
// spans ≥5 (charts/tables) → full.
const SPAN_CLASS: Record<number, string> = {
  1: 'sm:col-span-2 lg:col-span-1',
  2: 'sm:col-span-2 lg:col-span-2',
  3: 'sm:col-span-3 lg:col-span-3',
  4: 'sm:col-span-2 lg:col-span-4',
  5: 'sm:col-span-6 lg:col-span-5',
  6: 'sm:col-span-6 lg:col-span-6',
  7: 'sm:col-span-6 lg:col-span-7',
  8: 'sm:col-span-6 lg:col-span-8',
  9: 'sm:col-span-6 lg:col-span-9',
  10: 'sm:col-span-6 lg:col-span-10',
  11: 'sm:col-span-6 lg:col-span-11',
  12: 'sm:col-span-6 lg:col-span-12',
}

function spanClass(widget: Widget) {
  const span = isMetricWidget(widget)
    ? (widget.span ?? SPAN_BY_TYPE[getMetric(widget.metricId)?.resultType ?? 'value'] ?? 3)
    : SPAN_BY_KIND[widget.kind] ?? 3
  const base = SPAN_CLASS[span] ?? 'sm:col-span-2 lg:col-span-3'
  // A trailing gap in a KPI block is deliberate; the grid filling it with the next chart
  // is not. `newRow` pushes the widget back to column 1 (literal class — Tailwind JIT).
  return isMetricWidget(widget) && widget.newRow ? `${base} lg:col-start-1` : base
}
</script>

<template>
  <div class="flex flex-1 flex-col">
    <!-- Empty report: nothing added yet. Flexes so it centres in whatever height is left
         below the dashboard header. -->
    <div
      v-if="visible.length === 0 && !editing"
      class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <div class="flex size-12 items-center justify-center rounded-circle bg-grey-200 text-grey-600">
        <Icon name="Grid" :size="22" />
      </div>
      <h2 class="text-base font-semibold text-grey-900">This report is empty</h2>
      <p class="max-w-sm text-sm text-grey-600">
        Add widgets to start tracking the metrics that matter for “{{ reportName }}”.
      </p>
      <!-- The way in, not a placeholder: an empty report's only useful action is to
           start adding, which is what edit mode is for. Absent when the dashboard can't
           be edited, since there'd be nothing behind it. -->
      <Button v-if="canEdit" variant="secondary" size="sm" class="mt-1" @click="emit('edit')">
        <Icon name="Plus" :size="16" />
        Add widgets
      </Button>
    </div>

    <div v-else class="px-8 py-6">
      <div :class="gridClass">
        <template v-for="(widget, i) in visible" :key="widgetKey(widget, i)">
          <!-- Real metric widget -->
          <MetricBox
            v-if="isMetricWidget(widget)"
            :metric-id="widget.metricId"
            :editing="editing"
            :class="spanClass(widget)"
            @remove="emit('remove', widget)"
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

        <!-- Add widget, last in document order — appending is what the control does, so
             that's where it belongs. It takes a KPI's span and min-height so it can't make
             its row ragged, and it fills the deliberate trailing gap when the last row
             happens to leave one (a `newRow` widget can put that gap mid-grid instead). -->
        <button
          v-if="editing"
          type="button"
          class="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-grey-400 bg-white/50 text-sm font-medium text-grey-600 transition-colors hover:border-grey-600 hover:bg-white hover:text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:col-span-3 lg:col-span-3"
        >
          <Icon name="Plus" :size="20" />
          Add widget
        </button>
      </div>
    </div>
  </div>
</template>
