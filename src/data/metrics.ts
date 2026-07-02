// Mock metrics registry — the prototype's stand-in for the data team's `data.yml`
// semantic layer (TECH_FOUNDATION §6). It models the same shape (id, label, unit,
// grain/category, caveats) so the UI is built the way the real one will be.
//
// ⚠️ Mock: values are generated client-side (see src/lib/mock.ts). "In the
// registry ≠ queryable" (§5) — metrics whose live data/definition isn't confirmed
// are marked `status: 'pending'` and render the empty/unavailable state.

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
export type ResultType = 'value' | 'histogram' | 'time_series' | 'table'

/** ready = show a value; pending = definition/data not confirmed; restricted = gated. */
export type MetricStatus = 'ready' | 'pending' | 'restricted'

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
  /**
   * How a `pending` metric presents:
   *  - 'feature'        → "Create a board to see …" helper + a Create-a-board button
   *  - 'in-development' → "–" value + an "In development" pill
   */
  pendingVariant?: 'feature' | 'in-development'
  /** Helper line for `pendingVariant: 'feature'`. */
  pendingMessage?: string
}

export const METRICS: MetricDef[] = [
  {
    id: 'open_conversations',
    label: 'Open conversations',
    unit: 'count',
    resultType: 'value',
    status: 'ready',
    category: 'volume',
    base: 320,
    caveat: 'Conversations currently open (not yet resolved).',
  },
  {
    id: 'assigned_conversations',
    label: 'Assigned conversations',
    unit: 'count',
    resultType: 'value',
    status: 'ready',
    category: 'volume',
    base: 245,
    caveat: 'Open conversations assigned to an agent.',
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
    caveat: 'System-wide aggregate. Average excludes conversations with no agent reply.',
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
    caveat: 'Human resolution time (excludes AI-resolved tickets). Reopens reset the clock.',
  },
  {
    id: 'avg_csat',
    label: 'Average CSAT',
    unit: 'percentage',
    resultType: 'value',
    status: 'ready',
    category: 'quality',
    base: 0.92,
    caveat: 'Average across resolved conversations with a CSAT response.',
  },
  {
    id: 'win_rate',
    label: 'Win rate',
    unit: 'percentage',
    resultType: 'value',
    status: 'ready',
    category: 'sales',
    base: 0.34,
    caveat: 'Won deals ÷ closed deals. Optional date-filter behaviour still being confirmed.',
  },
  {
    id: 'conversations_by_hour',
    label: 'Conversations by hour',
    unit: 'count',
    resultType: 'histogram',
    status: 'ready',
    category: 'volume',
    base: 60,
    caveat: 'Volume of conversations created, bucketed by hour of day.',
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
    caveat: 'Conversations created vs closed over the selected period.',
  },
  {
    id: 'workload_by_agent',
    label: 'Workload by agent',
    unit: 'count',
    resultType: 'table',
    status: 'ready',
    category: 'efficiency',
    caveat: 'Open, closed and average response time per agent.',
  },
  {
    id: 'performance_by_channel',
    label: 'Performance by channel',
    unit: 'count',
    resultType: 'table',
    status: 'ready',
    category: 'efficiency',
    caveat: 'Volume, first response time and CSAT per channel.',
  },
  // --- Pending: not yet available (different reasons → different presentation) ---
  {
    id: 'avg_deal_size',
    label: 'Average deal size',
    unit: 'currency',
    resultType: 'value',
    status: 'pending',
    category: 'sales',
    caveat: 'Average value of won deals.',
    pendingVariant: 'feature',
    pendingMessage: 'Create a board to see deal metrics',
  },
  {
    id: 'pipeline_value',
    label: 'Pipeline value',
    unit: 'currency',
    resultType: 'value',
    status: 'pending',
    category: 'sales',
    caveat: 'Total value of deals currently in the Boards pipeline.',
    pendingVariant: 'feature',
    pendingMessage: 'Create a board to see pipeline value',
  },
  {
    id: 'calls_volume',
    label: 'Calls',
    unit: 'count',
    resultType: 'value',
    status: 'pending',
    category: 'voice',
    caveat: 'Total/missed volume rule (the date-window definition) is still TBD.',
    pendingVariant: 'in-development',
  },
]

export function getMetric(id: string): MetricDef | undefined {
  return METRICS.find((m) => m.id === id)
}
