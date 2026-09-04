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
  | 'heatmap' // day-of-week × hour-of-day grid (7 rows × 24 columns)
  | 'table'

/**
 * A way of breaking a measure down. Same number, different group-by — so these are
 * SETTINGS on one widget, not separate metrics (see the widget-settings plan).
 * `viz` picks the rendering when a result type supports more than one (a time series
 * can be bars or a line).
 */
export interface MetricDimension {
  id: string
  label: string
  resultType: ResultType
  viz?: 'bar' | 'line'
  /** Overrides the measure's caveat for this break-down. Views can cover different
   *  populations, so one tooltip often can't describe them all honestly. */
  caveat?: string
}

/**
 * A capability the workspace must have switched on before a metric can exist at all.
 * Distinct from `status: 'restricted'` (the metric exists, this USER can't see it):
 * without an SLA policy there is no target, so there is nothing to measure — the
 * widget isn't hidden, it's absent. Prototype-driven by the SLA toggle in the sidebar.
 */
export type FeatureFlag = 'sla'

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
  /** Volume metrics that aren't good or bad on their own: more calls can mean demand OR
   *  an outage, fewer can mean efficiency OR customers giving up. The delta still shows
   *  the movement — it just refuses to judge it. */
  neutral?: boolean
  /** Shown as a tooltip — definition caveats / open questions. */
  caveat?: string
  /** Muted line shown beneath the chart (data-coverage caveats). */
  footnote?: string
  /** Render a time_series as stacked bars (e.g. Inbound vs Outbound) instead of lines. */
  stacked?: boolean
  /** CSV header names for breakdown widgets (dimension + measure columns). */
  csvColumns?: { dimension: string; measure: string }
  /** Break-downs this measure supports. >1 renders a switcher in the card header;
   *  the active one overrides `resultType`. */
  dimensions?: MetricDimension[]
  /** Capability this metric depends on. Widgets bound to it are omitted from a page
   *  entirely while the capability is off. */
  requires?: FeatureFlag
}

export const METRICS: MetricDef[] = [
  {
    // registry: open_tickets [Overview]
    id: 'open_tickets',
    label: 'Open tickets',
    unit: 'count',
    resultType: 'value',
    status: 'ready',
    category: 'volume',
    neutral: true, // volume — reports the change, doesn't judge it
    base: 320,
    caveat: 'Tickets created in this period that are still open. A rising number can signal capacity issues.',
  },
  {
    // registry: assigned_tickets [Overview]
    id: 'assigned_tickets',
    label: 'Assigned tickets',
    unit: 'count',
    resultType: 'value',
    status: 'ready',
    category: 'volume',
    neutral: true, // volume — reports the change, doesn't judge it
    base: 245,
    caveat: 'Tickets created in this period that are assigned to an agent. Compare with open tickets to spot unassigned backlog.',
  },
  {
    // registry: first_response_time [Overview, Operate]
    id: 'first_response_time',
    label: 'First response time',
    unit: 'seconds',
    resultType: 'value',
    status: 'ready',
    category: 'efficiency',
    base: 95, // ~1m 35s
    lowerIsBetter: true,
    caveat:
      "Median time to the first reply from a human agent — automated replies don't count. Excludes tickets that start with an outbound message.",
  },
  {
    // registry: resolution_time_all [Overview] — AI *and* human. Used on both pages so
    // the two never disagree. ⚠️ the registry flags its AI/human predicate as "AN
    // INFERENCE, NOT CONFIRMED" — open dependency.
    id: 'resolution_time_all',
    label: 'Resolution time',
    unit: 'hours',
    resultType: 'value',
    status: 'ready',
    category: 'efficiency',
    base: 18000, // seconds (~5h)
    lowerIsBetter: true,
    caveat:
      'Median time from creation to close, covering both AI-resolved and human-handled tickets. Long times can signal process or knowledge gaps.',
  },
  {
    // registry: sla_compliance — ⚠️ marked Phase 2, EXCLUDED FROM MVP (confirmed by
    // Deborah, 2026-06-29). Present here as design-ahead, which is exactly why it sits
    // behind the SLA capability rather than in the default page.
    // Definition from the SLA project (`sla-definitions-and-how.md`, Theme 3).
    id: 'sla_compliance',
    label: 'SLA compliance',
    unit: 'percentage',
    resultType: 'value',
    status: 'ready',
    category: 'efficiency',
    requires: 'sla',
    base: 0.85, // the doc's worked example: 1,275 of 1,500 measured tickets
    caveat:
      'Share of tickets that met every SLA target that applied to them — miss one and the whole ticket counts as a breach. Tickets on channels without a policy are not measured.',
  },
  {
    // The headline is judged strictly — miss one target and the whole ticket fails — so it
    // can't say WHICH promise broke. These two split it. Each has its own denominator:
    // AI-only tickets have no first-response target but are still measured on resolution,
    // so the two are not percentages of the same population.
    // registry: no entry — depends on the same per-ticket verdict snapshot sla_compliance
    // needs, which doesn't exist yet.
    id: 'first_response_compliance',
    label: 'First response compliance',
    unit: 'percentage',
    resultType: 'value',
    status: 'ready',
    category: 'efficiency',
    requires: 'sla',
    base: 0.94,
    caveat:
      'Share of tickets that got a first reply within target. Any reply stops the clock, including an AI Agent’s. Tickets the AI handled alone have no first-response target, so they are not counted here.',
  },
  {
    id: 'resolution_compliance',
    label: 'Resolution compliance',
    unit: 'percentage',
    resultType: 'value',
    status: 'ready',
    category: 'efficiency',
    requires: 'sla',
    base: 0.88,
    caveat:
      'Share of tickets closed within their resolution target. Counts every measured ticket, including those the AI resolved on its own.',
  },
  {
    // registry: csat_average_score (no pages tag) — we place it on Improve
    id: 'avg_csat',
    label: 'Average CSAT',
    unit: 'percentage',
    resultType: 'value',
    status: 'ready',
    category: 'quality',
    base: 0.92,
    caveat: 'Average rating from CSAT surveys answered in this period, shown as a percentage of the maximum score.',
  },
  {
    // registry: win_rate [Overview]
    id: 'win_rate',
    label: 'Win rate',
    unit: 'percentage',
    resultType: 'value',
    status: 'ready',
    category: 'sales',
    base: 0.34,
    caveat: "Share of closed deals that were won. Deals still open aren't counted.",
  },
  {
    // registry: tickets_created_by_hour [Overview] — ORPHANED here (replaced by the heatmap)
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
    // registry: voip_avg_wait_time_suite [Operate] — ⚠️ its registry LABEL is 'Average wait time', which collides with our wait_time card
    // registry: voip_avg_wait_time_suite [Operate] — the entry itself says it "serves the
    // Operate page's 'Time to answer' row". Renamed from "Call wait time", which was
    // indistinguishable from the Average wait time card on the same page.
    id: 'time_to_answer',
    label: 'Time to answer',
    unit: 'seconds',
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    base: 42, // ~42s
    lowerIsBetter: true,
    caveat:
      "Average queue wait before an agent picks up. Doesn't include IVR or transfer time — see Average wait time for that.",
  },
  {
    // registry: voip_longest_wait_time [Operate] — now page-tagged, closing the "which
    // one does the Linear ticket mean" question. MAX(voip_queue_wait_seconds), no grouping,
    // so it shares the QUEUE basis with Time to answer, not the total-wait basis.
    id: 'longest_wait_time',
    label: 'Longest wait time',
    unit: 'seconds',
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    base: 380, // ~6m20s — well above the 42s average so the pair reads sensibly
    lowerIsBetter: true,
    caveat:
      'Longest single queue wait in this period. One unusual call can dominate this number.',
  },
  {
    // Registry: voip_avg_duration (pages: [Operate]). NOTE: that entry lists no filters
    // at all — including no date range — and no caveats. Flagged to the data team.
    // registry: voip_avg_duration [Operate] — now page-tagged. ⚠️ still lists NO date
    // filter (fields are duration + call type only), so as written it wouldn't respond to
    // the date picker. Open with the data team.
    id: 'avg_call_duration',
    label: 'Average call duration',
    unit: 'seconds',
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    base: 210, // ~3m30s
    lowerIsBetter: true, // AHT convention — shorter handling is usually better
    caveat: 'Average length of a call, inbound and outbound.',
  },
  {
    // registry: voip_shortest_call_duration [Operate] — added 2026-09-04 (was "doesn't
    // exist"). MIN(voip_call_duration), no grouping. ⚠️ no zero-length floor: the entry's
    // own caveat says a single zero-duration call dominates it, so in production this
    // reads ~0s until an exclusion rule is agreed.
    id: 'shortest_call_duration',
    label: 'Shortest call duration',
    unit: 'seconds',
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    base: 14,
    // Deliberately NOT lowerIsBetter: a shortest call trending UP means fewer instant
    // drops, which is the good direction here.
    caveat:
      'Shortest single call in this period, including calls that barely connected — usually drops or misdials.',
  },
  {
    // registry: voip_longest_call_duration [Operate] — added 2026-09-04 (was "doesn't
    // exist"). MAX(voip_call_duration), mirroring voip_longest_wait_time's shape.
    id: 'longest_call_duration',
    label: 'Longest call duration',
    unit: 'seconds',
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    base: 1500, // ~25m
    lowerIsBetter: true,
    caveat: 'Longest single call in this period. One unusual call can dominate this number.',
  },
  {
    // registry: tickets_created_over_time + tickets_closed_over_time [Operate] — two entries, one widget
    id: 'created_vs_closed',
    label: 'Created vs closed',
    unit: 'count',
    resultType: 'time_series',
    status: 'ready',
    category: 'volume',
    base: 500, // tickets created per day
    caveat: 'New tickets compared with closed ones. A widening gap means your backlog is growing.',
  },
  {
    // registry: workload_by_agent [Operate]
    id: 'workload_by_agent',
    label: 'Workload by agent',
    unit: 'count',
    resultType: 'table',
    status: 'ready',
    category: 'efficiency',
    caveat: 'Activity per agent. Agents with fewer assigned tickets may still carry longer or harder ones.',
  },
  {
    // registry: performance_by_channel [Operate]
    id: 'performance_by_channel',
    label: 'Performance by channel',
    unit: 'count',
    resultType: 'table',
    status: 'ready',
    category: 'efficiency',
    caveat: 'The same metrics for every channel, side by side. Low-volume channels can look volatile.',
  },
  {
    // One MEASURE, two break-downs — each backed by its OWN registry entry, which is
    // why each carries its own caveat: the two cover different populations and the
    // registry sizes the gap at ~35%.
    //   team → average_wait_time_by_team    (5-component total wait, VoIP2, incl. abandoned)
    //   time → voip_wait_time_by_day_suite  (queue wait only, VoIP1 + VoIP2)
    id: 'wait_time',
    label: 'Average wait time',
    unit: 'seconds',
    resultType: 'breakdown', // fallback; the active dimension overrides it
    status: 'ready',
    category: 'voice',
    base: 120, // ~2m average queue wait
    lowerIsBetter: true,
    caveat: 'Average time callers wait before being answered.',
    csvColumns: { dimension: 'team', measure: 'avg_wait_seconds' },
    dimensions: [
      {
        id: 'team',
        label: 'By team',
        resultType: 'breakdown',
        caveat:
          'Total wait — queue, IVR, forward and transfer — grouped by the answering agent\'s team, including calls the caller abandoned. Runs higher than the Over time view, which counts queue time only.',
      },
      {
        id: 'time',
        label: 'Over time',
        resultType: 'time_series',
        viz: 'bar',
        caveat:
          'Average queue wait per day. Counts queue time only, so it runs lower than the By team view.',
      },
    ],
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
      'Tickets created per day, alongside contacts messaging for the first time. A widening gap means existing contacts are driving the volume.',
  },
  {
    // registry: conversations_created (billing-window grain) — ⚠️ we label it 'Tickets created'; orphaned
    id: 'conversations_created',
    label: 'Tickets created',
    unit: 'count',
    resultType: 'time_series',
    status: 'ready',
    category: 'volume',
    neutral: true, // volume — reports the change, doesn't judge it
    base: 500, // per day
    caveat: 'Tickets created in this period.',
  },
  {
    // registry: entry_channel_tickets — ticket grain, so the 'Tickets' label is correct
    id: 'conversations_by_channel',
    label: 'Tickets by entry channel',
    unit: 'count',
    resultType: 'breakdown',
    status: 'ready',
    category: 'volume',
    base: 900, // per channel-ish, scaled by filters
    caveat: 'Tickets created in this period, split by the channel they came in on.',
  },
  {
    // registry: entry_channel_new_contacts
    id: 'new_contacts_by_channel',
    label: 'New contacts by entry channel',
    unit: 'count',
    resultType: 'breakdown',
    status: 'ready',
    category: 'volume',
    base: 260,
    caveat: 'Contacts created for the first time in this period, by entry channel.',
  },
  {
    // registry: tickets_new_vs_returning_contact — ⚠️ registry returns a percentage, we draw a donut of counts
    id: 'new_vs_returning',
    label: 'New vs returning contacts',
    unit: 'count',
    resultType: 'donut',
    status: 'ready',
    category: 'volume',
    base: 320,
    caveat: 'Contacts in this period, split into first-time (new) and returning.',
  },
  {
    // registry: voip_call_outcomes_by_day is the closest; inbound/outbound split not separately defined
    id: 'call_volume',
    label: 'Call volume',
    unit: 'count',
    resultType: 'time_series',
    status: 'ready',
    category: 'voice',
    base: 12, // calls per day, split inbound/outbound
    stacked: true,
    caveat: 'Calls per day, split into inbound and outbound.',
  },
  {
    // registry: voip_calls_by_day_hour [Overview] — added 2026-09-04, closing the
    // day-of-week gap we raised. NOT `calls_by_hour`, which is hour-only and the registry
    // now marks `pages: []`, superseded by this entry. Confirms UTC bucketing; Mon-first
    // ordering is left to the display layer, which HeatmapChart already does.
    id: 'voip_calls_by_day_hour',
    label: 'Calls by day & hour',
    unit: 'count',
    resultType: 'heatmap',
    status: 'ready',
    category: 'voice',
    base: 25,
    caveat:
      'Calls by day of week and hour, combining every Monday, every Tuesday, and so on. Shown in UTC.',
  },
  {
    // registry: deal_stage_funnel
    id: 'deal_stage_funnel',
    label: 'Deal stage funnel',
    unit: 'count',
    resultType: 'funnel',
    status: 'ready',
    category: 'sales',
    base: 600,
    caveat: 'Open deals by Boards pipeline stage in this period.',
  },
  // --- Not yet showing a value — presentation comes from src/data/emptyStates.ts ---
  {
    // registry: average_deal_size [Overview]
    id: 'avg_deal_size',
    label: 'Average deal size',
    unit: 'currency',
    resultType: 'value',
    status: 'ready',
    category: 'sales',
    base: 3450, // EUR — an average: doesn't scale with the date range
    caveat: 'Average value of a deal won in this period.',
  },
  {
    // registry: average_sales_cycle [Overview] — AVG(board_card_time_to_close_days).
    // Stored in DAYS (not seconds) — see fmtDays in src/lib/format.ts.
    id: 'average_sales_cycle',
    label: 'Average sales cycle',
    unit: 'days',
    resultType: 'value',
    status: 'ready',
    category: 'sales',
    base: 18,
    lowerIsBetter: true,
    caveat: 'Average days from creation to close, across won and lost deals.',
  },
  {
    // registry: pipeline_value [Overview] — no date filter in the registry (a current stock)
    id: 'pipeline_value',
    label: 'Pipeline value',
    unit: 'currency',
    resultType: 'value',
    status: 'ready',
    category: 'sales',
    base: 248000, // EUR — a current stock: doesn't scale with the date range
    caveat: 'Total value of all deals currently open. Not affected by the date range.',
  },
  {
    // registry: voip_total_calls [Overview]
    id: 'calls_volume',
    label: 'Total calls',
    unit: 'count',
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    neutral: true, // volume — reports the change, doesn't judge it
    base: 90, // ≈ the Call volume chart's 7-day total, for coherence
    caveat: 'All calls in this period, inbound and outbound, including missed ones.',
  },
  {
    // registry: voip_missed_rate [Overview] — added 2026-09-04, and it settles two things
    // we flagged: the MISSED predicate is now fully specified (version-gated), and BOTH
    // numerator and denominator are inbound-scoped, which is exactly what our tooltip
    // claims. The supporting count comes from voip_missed_calls.
    id: 'missed_calls',
    label: 'Missed calls',
    unit: 'percentage', // a rate — the raw count rides along as `secondary`
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    base: 0.16, // missed ÷ inbound
    lowerIsBetter: true,
    caveat:
      'Share of inbound calls that ended before an agent answered, including voicemails. Outbound calls are not counted.',
  },
]

export function getMetric(id: string): MetricDef | undefined {
  return METRICS.find((m) => m.id === id)
}
