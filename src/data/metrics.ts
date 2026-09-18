// Mock metrics registry — the prototype's stand-in for the data team's `data.yml`
// semantic layer (TECH_FOUNDATION §6). It models the same shape (id, label, unit,
// grain/category, caveats) so the UI is built the way the real one will be.
//
// ⚠️ Mock: values are generated client-side (see src/lib/mock.ts). "In the
// registry ≠ queryable" (§5) — how a metric presents when it has no value to show
// (the neutral empty state) lives in src/data/emptyStates.ts.

/** Controlled vocab from §6. */
import { BOARDS } from '@/data/boards'
import { tableBodyHeight } from '@/lib/widgetLayout'

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
  /** Picks the rendering when a result type supports more than one — a time series can be
   *  bars or a line. Same field as `MetricDimension.viz`, at the measure level for a
   *  metric that has no break-downs. */
  viz?: 'bar' | 'line'
  /** CSV header names for breakdown widgets (dimension + measure columns). */
  csvColumns?: { dimension: string; measure: string }
  /** Break-downs this measure supports. >1 renders a switcher in the card header;
   *  the active one overrides `resultType`. */
  dimensions?: MetricDimension[]
  /** Capability this metric depends on. Widgets bound to it are omitted from a page
   *  entirely while the capability is off. */
  requires?: FeatureFlag
  /** Override the body height its `resultType` would get (MetricBox's BODY_HEIGHT). A
   *  table defaults to 288 → a 362px card; a short one that wants to sit beside charts
   *  sets 200 and lands on 274. Drives the healthy render AND the empty/error states, so
   *  they can't disagree. */
  bodyHeight?: number
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
  // ── Satisfaction: two widgets, two questions ───────────────────────────────────────
  // Split from one card that carried both halves — an 84% headline over the rating bars.
  // Adding the verdict to Overview would have reprinted the top half of the Improve card
  // on another page, so the halves became the widgets: a number with no chart, and a chart
  // with no number. They read one shared set of responses (`csatResponses` in mock.ts), so
  // the rate and the bars cannot disagree.
  //
  // ⚠️ DATA ASK — NEITHER of these is in the registry. It has exactly two survey entries,
  // `csat_average_score` (AVG of the raw rating) and `csat_response_rate`, and the average
  // is the one thing neither widget shows: rescaling an average into a percentage is what
  // the old "92%" card did, borrowing the credibility of a rate for a different
  // calculation. Both asks derive from `csat_ticket_rating` on `trengodb__csat_tickets`,
  // which already exists — no new events, unlike the SLA asks:
  //   csat_satisfied_rate      → SAFE_DIVIDE(COUNTIF(csat_ticket_rating >= 4), COUNT(*))
  //   csat_rating_distribution → COUNT(*) GROUP BY csat_ticket_rating
  //
  // ⚠️ BOTH ASSUME A 1–5 SCALE. The registry only says "raw scale as stored in Trengo" and
  // never says what it is; 1–5 is what the original copy spec stated. If it's 1–10 or
  // thumbs, the 4–5 bucketing and the bar count both change.
  {
    id: 'csat_satisfied_rate',
    label: 'Customer satisfaction',
    unit: 'percentage',
    resultType: 'value',
    status: 'ready',
    category: 'quality',
    base: 0.83, // share rated 4–5
    // Higher is better and that is knowable, so this is neither `lowerIsBetter` nor
    // `neutral` — a satisfaction rate is the clearest case in the registry for a direction.
    caveat:
      "Share of answered surveys rated 4 or 5 out of 5. Only answered surveys count, so it says nothing about the customers who didn't reply.",
  },
  {
    id: 'csat_rating_distribution',
    label: 'Satisfaction ratings',
    // The unit describes the BARS (a count per rating), not a rate — the percentage lives
    // on the card above. Renamed from `avg_csat`, which named an average while rendering
    // first a rate and now a distribution.
    unit: 'count',
    resultType: 'breakdown',
    status: 'ready',
    category: 'quality',
    base: 120, // responses in a 7-day window
    caveat:
      'How many responses landed on each rating, 5 down to 1. A good headline with a tail of 1s is a different business from one without, and only the spread shows it.',
    csvColumns: { dimension: 'rating', measure: 'responses' },
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
    // registry: voip_avg_wait_time_suite [Operate] — its registry LABEL is 'Average wait
    // time'; nothing in our UI carries that name any more, so the collision is display-side only
    // registry: voip_avg_wait_time_suite [Operate] — the entry itself says it "serves the
    // Operate page's 'Time to answer' row". Renamed from "Call wait time", which was
    // indistinguishable from the Average wait time card on the same page.
    id: 'time_to_answer',
    label: 'Time to answer',
    unit: 'seconds',
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    base: 42, // illustrative — voiceQueue() in mock.ts owns the number these cards share
    lowerIsBetter: true,
    // Jeff's wording, verbatim, and its sibling below carries his other definition
    // verbatim too. The pair only works if each says which callers it counts, so the
    // populations are the first clause in both.
    caveat:
      'Average time a call waits in the queue before an agent picks up. Only answered calls count.',
  },
  {
    // ⚠️ DATA ASK — this combination is in NO registry entry. The registry has exactly two
    // wait columns and neither is "queue only AND including abandoned":
    //   voip_queue_wait_seconds    queue only ✓, but NULL for an abandoned call (its
    //                              derivation needs a first_in_progress event, which an
    //                              abandoned call never reaches), so the standard
    //                              IS NOT NULL filter drops exactly the callers we want.
    //                              VoIP1 + VoIP2.
    //   voip_call_total_wait_time  includes abandoned ✓, but is a 5-component sum that
    //                              also counts IVR, initial audio, forward and transfer —
    //                              the registry sizes that at ~34.9s (~35%) on a ~137s
    //                              number, not a rounding difference. VoIP2 only.
    // The one column that is structurally queue-only and written for abandoned calls is the
    // raw voip_call_initial_queue_wait_time, which the registry names once as a validation
    // target and never gives population semantics for.
    //
    // ASK: can a queue wait be recorded for a call nobody answered — i.e. is
    // voip_call_initial_queue_wait_time populated for abandoned-in-queue calls, and for
    // VoIP1 as well as VoIP2?
    //
    // ⚠️ Also note the LABEL collision, which is the registry's, not ours:
    // voip_avg_wait_time_suite is labelled "Average wait time" but computes
    // AVG(voip_queue_wait_seconds) — answered only. That entry is our Time to answer card
    // above. Nothing in the registry computes what this card shows.
    id: 'average_wait_time',
    label: 'Average wait time',
    unit: 'seconds',
    resultType: 'value',
    status: 'ready',
    category: 'voice',
    // Above time_to_answer's 42s and by a knowable amount: the registry's spot check has
    // abandoned callers waiting almost twice as long as answered ones, so blending them in
    // can only raise the average. voiceQueue() derives it rather than reading this.
    base: 50,
    lowerIsBetter: true,
    caveat:
      "Average time callers wait in the queue, including calls that are missed or abandoned. Time in the phone menu isn't counted.",
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
      "Longest single queue wait before a caller was answered. Callers who hung up aren't counted, and one unusual call can dominate this number.",
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
    // registry: voip_wait_time_by_day_suite — "same population as voip_avg_wait_time,
    // bucketed by day", i.e. the Time to answer KPI at a finer grain. Hence the name and
    // the matching base: they are one measure, and must never disagree on screen.
    //
    // The former "By team" view (average_wait_time_by_team) was REMOVED 2026-09-07 on the
    // data engineer's recommendation — Flow 1 / Flow 2 complexity. The registry backs it:
    // that metric is VoIP2 only "doubly so" (team-attribution gap, plus
    // voip_call_total_wait_time doesn't exist for VoIP1 at all), so a by-team number would
    // silently drop every VoIP1 call.
    id: 'time_to_answer_over_time',
    label: 'Time to answer over time',
    unit: 'seconds',
    resultType: 'time_series',
    viz: 'bar',
    status: 'ready',
    category: 'voice',
    base: 42, // matches time_to_answer — same measure, finer grain
    lowerIsBetter: true,
    caveat: 'Average queue wait per day. Same measure as Time to answer, shown day by day.',
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
    // Was "by Boards pipeline stage", against a stage list that knows nothing about
    // boards (see mock.ts) — a caveat is a promise, so the claim goes until the funnel
    // can actually be scoped to one. That's where a board PICKER belongs, incidentally:
    // stages are sequential and boards have different ones, so overlaying them is
    // unreadable and one-at-a-time is the honest read.
    caveat: 'Open deals by pipeline stage in this period.',
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
    // The four sales measures above, per board, in one widget.
    //
    // They used to be four KPI cards showing one workspace-wide number each — which only
    // works if every deal is in one currency and boards are worth summing. Neither holds:
    // a board declares its own currency (src/data/boards.ts), so "€248k of pipeline" was
    // a hard-coded glyph over an illegal sum.
    //
    // Rows over a picker, deliberately. The reason to merge four cards is that the
    // question became "how do our boards differ" — and a single-select answers that by
    // hiding every board but one, so you'd compare by clicking and remembering. Rows
    // compare in parallel, and they degrade the right way: at one board this is four
    // labelled numbers, which is a perfectly good card.
    //
    // No total row, ever. Adding EUR to USD is a category error, not a rounding one.
    id: 'sales_by_board',
    label: 'Sales by board',
    unit: 'count', // inert: a table formats its own cells
    resultType: 'table',
    status: 'ready',
    category: 'sales',
    // Exactly the rows it has — no reserved slack under the last board. Full width, so
    // it owns its row and nothing sits beside it to go ragged against; the 160/274/362
    // ladder only has to hold for cards that share a row.
    bodyHeight: tableBodyHeight(BOARDS.length),
    caveat:
      'Deal metrics for each Boards pipeline in this period. Amounts are shown in each board’s own currency and are never converted, so they don’t add up to a workspace total.',
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
