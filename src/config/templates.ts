// The template catalog.
//
// A TEMPLATE is a named, ordered collection of widgets — the blueprint a user
// picks when creating a new dashboard tab.
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

export interface WidgetPlaceholder {
  name: string
  kind: WidgetKind
}

/** A real widget bound to a metric in the registry (renders a MetricBox). */
export interface MetricWidget {
  metricId: string
  /** Width in the 12-column grid (1–12). Defaults by result type; the future
   *  drag-to-resize hook writes this. */
  span?: number
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
    description: 'A general overview of conversations, response times, and team activity.',
    widgets: [
      { name: 'Open conversations', kind: 'value' },
      { name: 'Assigned conversations', kind: 'value' },
      { name: 'First response time', kind: 'value' },
      { name: 'Resolution time', kind: 'value' },
      { name: 'Conversations by hour', kind: 'histogram' },
      { name: 'Agent online status', kind: 'tbd' },
    ],
  },
  {
    id: 'workload-management',
    name: 'Workload management',
    description: 'Created, closed and re-opened conversations and overall workload over time.',
    widgets: [
      { name: 'Created conversations', kind: 'value' },
      { name: 'Closed conversations', kind: 'value' },
      { name: 'Re-opened conversations', kind: 'value' },
      { name: 'Total resolution time', kind: 'value' },
      { name: 'First response time', kind: 'value' },
      // Line graph, renamed from "Workload management".
      { name: 'Created tickets vs Closed tickets', kind: 'trend' },
      { name: 'Conversations created', kind: 'trend' },
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
      { metricId: 'open_conversations' },
      { metricId: 'assigned_conversations' },
      { metricId: 'first_response_time' },
      { metricId: 'resolution_time' },
      { metricId: 'avg_csat' },
      { metricId: 'win_rate' },
      { metricId: 'conversations_by_hour' },
      { metricId: 'avg_deal_size' },
      { metricId: 'pipeline_value' },
      { metricId: 'calls_volume' },
    ],
  },
  {
    id: 'understand',
    name: 'Understand',
    description: 'Diagnostic insight into customer behaviour and needs.',
    recommended: true,
    widgets: [
      { metricId: 'conversations_and_new_contacts' }, // full-width dual line
      { metricId: 'conversations_by_channel', span: 7 }, // slightly wider than the donut
      { metricId: 'new_vs_returning', span: 5 }, // donut (7 + 5 = 12, one row)
      { metricId: 'deal_stage_funnel' }, // full-width funnel
    ],
  },
  {
    id: 'operate',
    name: 'Operate',
    description: 'Live operational performance.',
    recommended: true,
    widgets: [
      { metricId: 'first_response_time' },
      { metricId: 'resolution_time' },
      { metricId: 'call_wait_time' },
      { metricId: 'created_vs_closed' },
      { metricId: 'workload_by_agent' },
      { metricId: 'performance_by_channel' },
    ],
  },
  {
    id: 'improve',
    name: 'Improve',
    description: 'Where to prioritise change — knowledge, process, automation.',
    recommended: true,
    widgets: [],
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
