// Mock metrics registry — the prototype's stand-in for the data team's `data.yml`
// semantic layer (TECH_FOUNDATION §6). It models the same shape (id, label, unit,
// grain/category, caveats) so the UI is built the way the real one will be.
//
// ⚠️ Mock: values are generated client-side (see src/lib/mock.ts). "In the
// registry ≠ queryable" (§5) — how a metric presents when it has no value to show
// (the neutral empty state) lives in src/data/emptyStates.ts.

/** Controlled vocab from §6. */
export type Unit =
  | 'count'
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'days'
  | 'percentage'
  | 'currency'

/** What kind of result the metric returns (§4). */
export type ResultType =
  | 'value'
  | 'histogram' // 24 hour-of-day buckets (Today + Average)
  | 'time_series' // line chart over the selected range
  | 'breakdown' // bar chart: one bar per category, or bucketed two-series bars
  | 'donut' // doughnut chart (share of a total across a few segments)
  | 'funnel' // horizontal funnel (counts per stage)
  | 'table'

/** ready = show a value; restricted = gated by permissions. */
export type MetricStatus = 'ready' | 'restricted'

export type Category = 'volume' | 'efficiency' | 'quality' | 'sales' | 'voice'

export interface MetricDef {
  id: string
  label: string
  unit: Unit
  resultType: ResultType
  status: MetricStatus
  category: Category
  /** Baseline mock magnitude (value metrics). Scaled by filters in src/lib/mock.ts. */
  base?: number
  /** When true, a DECREASE is good (faster response, less time) — flips delta colour. */
  lowerIsBetter?: boolean
  /** Shown as a tooltip — definition caveats / open questions. */
  caveat?: string
  /** Muted line shown beneath the chart (data-coverage caveats). */
  footnote?: string
  /** Render a time_series as stacked bars (e.g. Inbound vs Outbound) instead of lines. */
  stacked?: boolean
  /** CSV header names for breakdown widgets (dimension + measure columns). */
  csvColumns?: { dimension: string; measure: string }
}

export const METRICS: MetricDef[] = [
  {
    id: 'open_conversations',
    label: 'Open tickets',
    unit: 'count',
    resultType: 'value',
    status: 'ready',
    category: 'volume',
    base: 320,
    caveat: 'Tickets currently open. A rising number may signal capacity issues.',
  },
  {
    id: 'assigned_conversations',
    label: 'Assigned tickets',
    unit: 'count',
    resultType: 'value',
    status: 'ready',
    category: 'volume',
    base: 245,
    caveat: 'Tickets currently assigned to an agent. Compare with open tickets to spot unassigned backlog.',
  },
  {
    id: 'first_response_time',
    label: 'First response time',
    unit: 'seconds',
    resultType: 'value',
    status: 'ready',
    category: 'efficiency',
    base: 95, // ~1m 35s
    lowerIsBetter: true,
    caveat:
      "Median time to the first reply from a human agent; automated replies don't count. Excludes tickets that start with an outbound message.",
  },
  {
    id: 'resolution_time',
    label: 'Resolution time',
    unit: 'hours',
    resultType: 'value',
    status: 'ready',
    category: 'efficiency',
    base: 18000, // seconds (~5h)
    lowerIsBetter: true,
    caveat: 'Median time from creation to close, for human-handled tickets (not AI-resolved). Long times signal process or knowledge gaps.',
  },
  {
    id: 'avg_csat',
    label: 'Average CSAT',
    unit: 'percentage',
    resultType: 'value',
    status: 'ready',
    category: 'quality',
    base: 0.92,
    caveat: 'Average rating from CSAT surveys answered in this period. Scale: 1–5.',
  },
  {
    id: 'win_rate',
    label: 'Win rate',
    unit: 'percentage',
    resultType: 'value',
    status: 'ready',
    category: 'sales',
    base: 0.34,
    caveat: 'Share of opportunities that closed as won.',
  },
  {
    id: 'conversations_by_hour',
    label: 'Tickets by hour',
    unit: 'count',
    resultType: 'histogram',
    status: 'ready',
    category: 'volume',
    base: 60,
    caveat: 'Hourly distribution of new tickets, shown in UTC. Use it to spot peak demand.',
  },
  // --- Operate page ---
  {
    id: 'call_wait_time',
    label: 'Call wait time',
    unit: 'seconds',
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    base: 42, // ~42s
    lowerIsBetter: true,
    caveat: 'Average time callers wait before an agent answers.',
  },
  {
    id: 'created_vs_closed',
    label: 'Created vs closed',
    unit: 'count',
    resultType: 'time_series',
    status: 'ready',
    category: 'volume',
    base: 500, // tickets created per day
    caveat: 'New tickets against closed ones. A widening gap means your backlog is growing.',
  },
  {
    id: 'workload_by_agent',
    label: 'Workload by agent',
    unit: 'count',
    resultType: 'table',
    status: 'ready',
    category: 'efficiency',
    caveat: 'Activity per agent, for the selected period and filters. Agents with fewer assigned tickets may still carry longer or harder ones.',
  },
  {
    id: 'performance_by_channel',
    label: 'Performance by channel',
    unit: 'count',
    resultType: 'table',
    status: 'ready',
    category: 'efficiency',
    caveat: 'Compare how each channel performs on the same metrics. Volume differences between channels can make small channels look volatile.',
  },
  {
    id: 'wait_time_by_team',
    label: 'Average wait time by team',
    unit: 'seconds',
    resultType: 'breakdown',
    status: 'ready',
    category: 'voice',
    base: 120, // ~2m average queue wait
    lowerIsBetter: true,
    caveat: 'Average time callers wait before a team answers. Shows which teams need more voice capacity.',
    csvColumns: { dimension: 'team', measure: 'avg_wait_seconds' },
  },
  // --- Understand page ---
  {
    id: 'conversations_and_new_contacts',
    label: 'Tickets & new contacts',
    unit: 'count',
    resultType: 'time_series',
    status: 'ready',
    category: 'volume',
    base: 500,
    caveat:
      'Tickets created per day, alongside contacts messaging for the first time. A narrowing gap means growth is coming from new people; a widening gap means existing contacts are messaging more.',
  },
  {
    id: 'conversations_created',
    label: 'Tickets created',
    unit: 'count',
    resultType: 'time_series',
    status: 'ready',
    category: 'volume',
    base: 500, // per day
    caveat: 'Tickets created over the selected period.',
  },
  {
    id: 'conversations_by_channel',
    label: 'Tickets by entry channel',
    unit: 'count',
    resultType: 'breakdown',
    status: 'ready',
    category: 'volume',
    base: 900, // per channel-ish, scaled by filters
    caveat: 'Tickets created in the period, split by the channel they came in on.',
  },
  {
    id: 'new_contacts_by_channel',
    label: 'New contacts by entry channel',
    unit: 'count',
    resultType: 'breakdown',
    status: 'ready',
    category: 'volume',
    base: 260,
    caveat: 'Contacts created for the first time in the period, by entry channel.',
  },
  {
    id: 'new_vs_returning',
    label: 'New vs returning contacts',
    unit: 'count',
    resultType: 'donut',
    status: 'ready',
    category: 'volume',
    base: 320,
    caveat: 'Contacts in the period split into first-time (new) and returning.',
  },
  {
    id: 'call_volume',
    label: 'Call volume',
    unit: 'count',
    resultType: 'time_series',
    status: 'ready',
    category: 'voice',
    base: 12, // calls per day, split inbound/outbound
    stacked: true,
    caveat: 'Inbound and outbound calls over the selected period, split by direction.',
  },
  {
    id: 'calls_by_hour',
    label: 'Calls by hour',
    unit: 'count',
    resultType: 'histogram',
    status: 'ready',
    category: 'voice',
    base: 25,
    caveat: 'Volume of calls, bucketed by hour of day (UTC).',
  },
  {
    id: 'deal_stage_funnel',
    label: 'Deal stage funnel',
    unit: 'count',
    resultType: 'funnel',
    status: 'ready',
    category: 'sales',
    base: 600,
    caveat: 'Open deals by Boards pipeline stage in the period.',
  },
  // --- Not yet showing a value — presentation comes from src/data/emptyStates.ts ---
  {
    id: 'avg_deal_size',
    label: 'Average deal size',
    unit: 'currency',
    resultType: 'value',
    status: 'ready',
    category: 'sales',
    caveat: 'Average value of a closed-won deal in this period.',
  },
  {
    id: 'pipeline_value',
    label: 'Pipeline value',
    unit: 'currency',
    resultType: 'value',
    status: 'ready',
    category: 'sales',
    caveat: 'Total value of all open deals.',
  },
  {
    id: 'calls_volume',
    label: 'Calls',
    unit: 'count',
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    caveat: 'Inbound and outbound calls handled across your voice channels.',
  },
]

export function getMetric(id: string): MetricDef | undefined {
  return METRICS.find((m) => m.id === id)
}
