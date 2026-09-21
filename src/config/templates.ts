// The template catalog.
//
// A TEMPLATE is a named, ordered collection of widgets — the blueprint a user
// picks when creating a new report.
//
// ⚠️ ONE METRIC PER PAGE. A metric may appear on SEVERAL templates — First response time
// and Resolution time are on both Overview and Operate, and Customer satisfaction is on
// Overview and Improve — but never twice on the same one.
//
// Across pages it is free: TECH_FOUNDATION §4 gives each page its own aggregate endpoint,
// and `metricValue` seeds on `${def.id}|${signature}`, so two pages showing one metric
// under the same filters return the same number by construction. Twice on ONE page is the
// problem — that page's single aggregate call would either fetch the metric twice or make
// two boxes share one response, a special case in the one place the architecture is
// deliberately simple. `warnOnDuplicateMetrics()` at the foot of this file catches it in
// dev; `addWidget` already refuses it on the runtime path.
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
      // Back to half width with a partner beside it. It went full width when the wait-time
      // trend was retired and it was left alone next to a 585px hole; Calls by team is
      // exactly the span-6 neighbour it lost. `newRow` because the KPI block above can
      // leave a trailing gap, and without it the grid pulls this 274px chart up beside two
      // 160px cards.
      { metricId: 'created_vs_closed', span: 6, newRow: true },
      { metricId: 'calls_by_team', span: 6 },
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
    // The PM's five CSAT rows, all landed.
    //
    // This page used to carry the ratings and NOT the rate, on the reasoning that "the
    // satisfaction rate is Overview's job — a number you glance at — and this page is where
    // you act on the shape". That split existed to keep two different CSAT widgets
    // distinguishable. The one-metric-per-page rule at the top of this file removes its
    // premise: a metric is allowed on both pages, and the score belongs at the head of the
    // page that exists to improve it. Overview keeps its copy, unchanged.
    //
    // Reads as one argument: how satisfied customers are, how much of the base that speaks
    // for, how it moved, and what it is made of. The score leads and the response rate
    // qualifies it — the same order Operate uses, where SLA compliance leads the row because
    // it is the verdict on the timers that follow.
    //
    // ⚠️ 83% therefore appears three times on this page: as the KPI, as the trend line's
    // level, and as the breakdown's Positive row. That is the ordinary headline + trend +
    // composition pattern rather than a duplication bug — all three read one `csatResponses()`
    // draw, so they cannot disagree — but it is the reason the old "no number printed twice"
    // note is gone rather than merely moved.
    //
    // `newRow` on the first chart, or the grid pulls a 274px chart up beside a 160px KPI.
    widgets: [
      { metricId: 'csat_satisfied_rate' },
      { metricId: 'csat_response_rate' },
      // The trend and the breakdown pair 50/50: how satisfaction moved, and what it is made
      // of. The rule this page follows is that a chart's span tracks whether it has a PEER —
      // this went to span 12 for one commit while Satisfaction by channel took the row
      // below, and comes back to 6 now that the breakdown is its partner.
      //
      // `newRow` is load-bearing again at this span. At 12 the grid broke the row on its
      // own; at 6 the KPI above leaves a 9-column gap that a 274px chart would drop into,
      // beside a 160px card — the imbalance `needsNewRow` exists to prevent.
      { metricId: 'csat_score_over_time', span: 6, newRow: true },
      { metricId: 'csat_sentiment_breakdown', span: 6 },
      // Satisfaction by channel came off because nobody asked for it: "the CSAT breakdown"
      // meant the three sentiment buckets, and a dimensional cut was my reading of the PM's
      // unnamed row rather than the row itself. It is also the only CSAT widget here that
      // needs data we haven't got — the sentiment split is a client-side bucketing of a
      // query already requested, while this one needs a csat_tickets.ticket_id →
      // tickets.channel_type join the registry has never declared. Still in the library if
      // that join ever lands and the question is worth asking.
      // { metricId: 'csat_by_channel', span: 6 },
      // Satisfaction ratings came off when the sentiment breakdown landed: they are the
      // same responses, five buckets against three, and the page was printing one set of
      // surveys twice. The three-bucket version is also the only one that survives a
      // thumbs up/down workspace, where 5★→1★ renders two bars and three empty columns.
      // Metric, mock, empty state and library row all stay, so restoring it here is one
      // line and adding it to a report is one click.
      // { metricId: 'csat_rating_distribution', span: 6 },
      // Surveys received came off when Satisfaction over time landed: its bars ARE the
      // survey volume, so keeping both printed the same seven bars twice on one page. The
      // metric, mock and empty state all stay, so it is still addable from the library for
      // anyone who wants volume on its own.
      // { metricId: 'csat_surveys_received', span: 6 },
    ],
  },
  {
    id: 'automate',
    name: 'Automate',
    description: 'Health, coverage and reliability of automation.',
    recommended: true,
    widgets: [],
  },
]

/**
 * Dev-only: a metric may appear on SEVERAL templates, but only ONCE per template.
 *
 * `addWidget` already refuses a duplicate on the runtime path — but it is scoped to the
 * report it is adding to, so it never sees this file. A metricId listed twice here renders
 * two identical cards and says nothing, which is exactly the class of thing that ships
 * unnoticed. Runs at module scope so it fires on first import rather than on a page visit,
 * and `import.meta.env.DEV` strips the whole thing from the production bundle.
 *
 * Modelled on `Icon.vue`'s missing-glyph warning, the project's one other dev-time check.
 * The `orphanedMetricIds()` check that `metricGroups.ts` has promised since September wants
 * the same shape and belongs beside it.
 */
function warnOnDuplicateMetrics(): void {
  if (!import.meta.env.DEV) return
  for (const template of TEMPLATES) {
    const seen = new Set<string>()
    for (const widget of template.widgets) {
      if (!isMetricWidget(widget)) continue
      if (seen.has(widget.metricId)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[templates] ${template.name} lists "${widget.metricId}" twice. ` +
            'A metric may appear on several pages, but only once per page.',
        )
      }
      seen.add(widget.metricId)
    }
  }
}
warnOnDuplicateMetrics()

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
