// The template catalog.
//
// A TEMPLATE is a named, ordered collection of widgets — the blueprint a user
// picks when creating a new report.
//
// ⚠️ Mock: the widgets below are placeholder display names + a "kind", NOT real
// metrics. They render as empty placeholder cards for now; the real "metric box"
// (wired to the metrics registry) comes in a later step. `kind` drives the card's
// tag and width only.

export type WidgetKind =
  | 'value' // single number
  | 'trend' // line graph over time
  | 'histogram' // by-hour / distribution bars
  | 'table' // small table
  | 'breakdown' // simple breakdown (not a table)
  | 'tbd' // not decided yet

/** Identity for one PLACED widget. Not part of a template's own data — templates are
 *  blueprints, and the same template widget can be placed on many reports — so it is
 *  stamped when a widget is copied onto a report (`reportFromTemplate`) or added to one
 *  (`addWidget`). It gives the grid a key that can't collide, and gives the coming
 *  drag/resize and per-widget settings a handle that survives reordering.
 *  Optional so any widget literal without one still renders. */
export interface WidgetIdentity {
  uid?: string
}

export interface WidgetPlaceholder extends WidgetIdentity {
  name: string
  kind: WidgetKind
}

/** A real widget bound to a metric in the registry (renders a MetricBox). */
export interface MetricWidget extends WidgetIdentity {
  metricId: string
  /** Width in the 12-column grid (1–12). Defaults by result type; the future
   *  drag-to-resize hook writes this. */
  span?: number
  /** Force this widget to start a new row. Without it the grid backfills a trailing
   *  gap with whatever fits — which drags a tall chart up beside short KPI cards. */
  newRow?: boolean
}

/** A template widget is either a (mock) placeholder or a real metric widget. */
export type Widget = WidgetPlaceholder | MetricWidget

export function isMetricWidget(w: Widget): w is MetricWidget {
  return 'metricId' in w
}

export interface Template {
  id: string
  name: string
  description: string
  widgets: Widget[]
  /** Surface this template first + show a "Recommended" badge in the gallery. */
  recommended?: boolean
}

export const TEMPLATES: Template[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'A general overview of tickets, response times, and team activity.',
    widgets: [
      { name: 'Open tickets', kind: 'value' },
      { name: 'Assigned tickets', kind: 'value' },
      { name: 'First response time', kind: 'value' },
      { name: 'Resolution time', kind: 'value' },
      { name: 'Tickets by hour', kind: 'histogram' },
      { name: 'Agent online status', kind: 'tbd' },
    ],
  },
  {
    id: 'workload-management',
    name: 'Workload management',
    description: 'Created, closed and re-opened tickets and overall workload over time.',
    widgets: [
      { name: 'Created tickets', kind: 'value' },
      { name: 'Closed tickets', kind: 'value' },
      { name: 'Re-opened tickets', kind: 'value' },
      { name: 'Total resolution time', kind: 'value' },
      { name: 'First response time', kind: 'value' },
      // Line graph, renamed from "Workload management".
      { name: 'Created tickets vs Closed tickets', kind: 'trend' },
      { name: 'Tickets created', kind: 'trend' },
    ],
  },
  {
    id: 'agent-performance',
    name: 'Agent performance',
    description: 'How work is distributed across agents.',
    widgets: [
      // Renamed; overlaps with the broader agent-performance reporting.
      { name: 'Workload by agents', kind: 'table' },
    ],
  },
  {
    id: 'customer-satisfaction',
    name: 'Customer satisfaction report',
    description: 'CSAT score, response rate and satisfaction breakdown.',
    widgets: [
      { name: 'CSAT score', kind: 'value' },
      { name: 'Response rate', kind: 'value' },
      { name: 'Satisfaction score', kind: 'histogram' }, // Score & Surveys
      { name: 'CSAT breakdown', kind: 'breakdown' },
    ],
  },

  // The five question-led templates (TECH_FOUNDATION §1). Empty for now — they
  // start blank and the user fills them with widgets later ("Manage widgets").
  {
    id: 'overview',
    name: 'Overview',
    description: 'At-a-glance health and KPIs.',
    recommended: true,
    widgets: [
      // 4-up KPI rows via the value-card default (span 3) — the same card width Operate
      // uses. Grouped by domain, and the reading order is the argument: four support KPIs,
      // then the verdict on them, then voice, then the full-width heatmap, then sales.
      // One slot is left over at the end of row 2 — the deliberate trailing gap, and it is
      // exactly the width of the "+ Add widget" tile that fills it in edit mode.
      // Support
      { metricId: 'open_tickets' },
      { metricId: 'assigned_tickets' },
      { metricId: 'first_response_time' },
      { metricId: 'resolution_time_all' },
      // Quality — the number only. The ratings behind it are a widget of their own, on
      // Improve, where acting on a tail of 1s belongs.
      { metricId: 'csat_satisfied_rate' },
      // Voice
      { metricId: 'calls_volume' },
      { metricId: 'missed_calls' },
      { metricId: 'voip_calls_by_day_hour' }, // day × hour heatmap (replaced Tickets by hour)
      // Sales — one table, boards as rows. It was these four as separate KPI cards, which
      // could only show one workspace-wide number each: fine until you notice a board
      // declares its own currency, at which point a single "pipeline value" is summing
      // euros and dollars. The four metrics still exist and stay addable from the widget
      // library; what changed is that this page says which board it's talking about.
      { metricId: 'sales_by_board' },
    ],
  },
  {
    id: 'understand',
    name: 'Understand',
    description: 'Diagnostic insight into customer behaviour and needs.',
    recommended: true,
    widgets: [
      { metricId: 'conversations_and_new_contacts', span: 6 }, // 50/50 with call volume
      { metricId: 'call_volume', span: 6 }, // stacked bars (inbound/outbound), 50/50
      { metricId: 'conversations_by_channel', span: 12 }, // full-width while the donut is hidden
      // Temporarily hidden — bring back later.
      // { metricId: 'new_vs_returning', span: 5 }, // donut (7 + 5 = 12, one row)
      // { metricId: 'deal_stage_funnel' }, // full-width funnel
    ],
  },
  {
    id: 'operate',
    name: 'Operate',
    description: 'Live operational performance.',
    recommended: true,
    widgets: [
      // KPIs take the value-card default (span 3 → 4-up), same as every other page.
      // Under drag-and-drop + resize you can't guarantee rows fill, so gaps have to look
      // deliberate rather than broken — a consistent column rhythm gives predictable
      // snap targets, and the trailing empty slot is where "+ Add widget" will live.
      // SLA compliance is only present when the capability is on (metric
      // `requires: 'sla'`). It leads the row deliberately: it's the verdict on the two
      // timers that follow it. With SLA off the page is exactly as before; with it on,
      // the 7 KPIs become 8 and the two rows fill completely.
      { metricId: 'sla_compliance' },
      // Temporarily hidden — bring back later. They split the strict headline into which
      // promise broke, each with its own denominator (AI-only tickets have no
      // first-response target). Metrics, mock and the shared verdict set all stay, so
      // restoring is just uncommenting these two lines.
      // { metricId: 'first_response_compliance' },
      // { metricId: 'resolution_compliance' },
      { metricId: 'first_response_time' },
      { metricId: 'resolution_time_all' },
      // The queue, three ways: how long the people who got through waited, how long
      // everyone waited including the ones who gave up, and the worst single wait. Adjacent
      // on purpose — each only means something against the other two.
      { metricId: 'time_to_answer' },
      { metricId: 'average_wait_time' },
      { metricId: 'longest_wait_time' },
      { metricId: 'avg_call_duration' },
      { metricId: 'shortest_call_duration' },
      { metricId: 'longest_call_duration' },
      // Full width, and no `newRow` needed: at span 12 the grid's sparse flow breaks the
      // row by itself. It was narrowed to 6 only to pair with the wait-time trend below,
      // and alone at that width it sat beside a 585px hole — chart-shaped, where the
      // trailing gaps this page treats as deliberate are KPI-shaped.
      { metricId: 'created_vs_closed' },
      // Temporarily hidden — bring back later. Average queue wait per day, which is the
      // Time to answer KPI two cards above at a finer grain; the page carried both a number
      // and a chart of one measure. Metric, mock branch and empty state all stay, so it is
      // still addable from the widget library and restoring it here is one line.
      // { metricId: 'time_to_answer_over_time', span: 6 },
      { metricId: 'workload_by_agent' },
      { metricId: 'performance_by_channel' },
    ],
  },
  {
    id: 'improve',
    name: 'Improve',
    description: 'Where to prioritise change — knowledge, process, automation.',
    recommended: true,
    // The ratings, not the rate: the rate is Overview's job (a number you glance at), and
    // this page is where you'd act on the shape — a healthy headline sitting on a tail of
    // 1s is the case this chart exists to expose.
    widgets: [{ metricId: 'csat_rating_distribution', span: 6 }],
  },
  {
    id: 'automate',
    name: 'Automate',
    description: 'Health, coverage and reliability of automation.',
    recommended: true,
    widgets: [],
  },
]

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

/** The new question-led templates — what new users start with. */
export const QUESTION_LED_TEMPLATE_IDS = [
  'overview',
  'understand',
  'operate',
  'improve',
  'automate',
]

/** The legacy reports, rebuilt — the "keep my current reports" migration path. */
export const LEGACY_REPORT_TEMPLATE_IDS = [
  'dashboard',
  'workload-management',
  'agent-performance',
  'customer-satisfaction',
]
