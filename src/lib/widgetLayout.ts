// Widget layout — how wide a widget is, and which Tailwind classes say so.
//
// Extracted from WidgetGrid so the GRID and the WIDGET LIBRARY read one map. The library
// tells you the size a widget will be before you add it, and `addWidget` decides whether
// the new widget needs `newRow` — both are the same question the grid answers when it
// renders. Two copies of this table is how the picker and the grid would come to disagree
// about a widget nobody had looked at.
//
// It is also the seam the future drag-to-resize needs: resizing is writing `span`, and
// this is the only place that knows what a span means.
import { isMetricWidget, type Widget, type WidgetKind } from '@/config/templates'
import { getMetric } from '@/data/metrics'

// Default span by metric result type (out of 12). Value cards default to 3 → 4-up KPI
// rows: ONE card width across every page, so a KPI is the same size wherever you meet
// it and the snap targets stay predictable once widgets can be dragged and resized.
// Rows aren't guaranteed to fill — a trailing gap is deliberate, and it's where
// "+ Add widget" lives. Set a per-widget `span` to override (also the drag-resize hook).
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

/** The width a metric gets when nobody has chosen one. */
export function defaultSpanForMetric(metricId: string): number {
  return SPAN_BY_TYPE[getMetric(metricId)?.resultType ?? 'value'] ?? 3
}

/** The span a widget actually renders at — its own if it has one, else the default. */
export function widgetSpan(widget: Widget): number {
  if (!isMetricWidget(widget)) return SPAN_BY_KIND[widget.kind] ?? 3
  return widget.span ?? defaultSpanForMetric(widget.metricId)
}

/**
 * A widget wider than a KPI has to start its own row.
 *
 * Not because of span 12 — CSS grid's sparse flow already breaks that to a new line. It's
 * span 6: a 274px chart drops neatly into the 6 free columns left by a part-filled KPI
 * row and lands beside two 160px cards. That's the imbalance `templates.ts` patches by
 * hand with `newRow: true`; this is the same judgement, applied by the code that appends.
 */
export function needsNewRow(span: number): boolean {
  return span >= 6
}

/** The grid classes for one widget: its width, plus a row break when it asked for one. */
export function spanClass(widget: Widget): string {
  const base = SPAN_CLASS[widgetSpan(widget)] ?? 'sm:col-span-2 lg:col-span-3'
  // A trailing gap in a KPI block is deliberate; the grid filling it with the next chart
  // is not. `newRow` pushes the widget back to column 1 (literal class — Tailwind JIT).
  return isMetricWidget(widget) && widget.newRow ? `${base} lg:col-start-1` : base
}
