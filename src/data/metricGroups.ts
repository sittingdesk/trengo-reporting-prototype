// How the widget library organises the metric catalogue.
//
// Grouped by SUBJECT — what is being measured — not by the registry's `category` and
// definitely not by `resultType`. Nobody opens a picker wanting a histogram, and
// `category` is the data team's axis rather than the reader's: it files tickets and
// contacts together under `volume` while `quality` has exactly one member, which renders
// as a section that looks broken.
//
// The subjects are the collapse mapping already recorded for the measure/break-down model
// ("Tickets by hour / by entry channel / created" are one measure at three break-downs).
// So when that model lands, the library's structure doesn't change — only the row count
// shrinks. That is the cheapest possible bet on where the catalogue is going.
//
// Kept HERE rather than as a field on MetricDef: `src/data/metrics.ts` mirrors the data
// team's registry, and this grouping is ours. The cost is that a new metric has to be added
// to a subject below, or it won't be offerable — silently. ⚠️ An earlier version of this
// note promised an `orphanedMetricIds()` dev check would catch that; no such function was
// ever written, so nothing warns you today. Worth building if this list grows.
//
// It cuts the other way too, which is the useful part: commenting an id out below is how a
// metric is taken out of circulation without deleting it.

export interface MetricSubject {
  id: string
  /** Section heading in the library. */
  label: string
  /** Metric ids, in the order they should be offered. */
  metricIds: string[]
}

/**
 * Section order is roughly "most reports start here" first. Calls is last of the big
 * groups because it only applies to workspaces with voice.
 */
export const METRIC_SUBJECTS: MetricSubject[] = [
  {
    id: 'tickets',
    label: 'Tickets',
    metricIds: [
      'open_tickets',
      'assigned_tickets',
      'created_vs_closed',
      'conversations_created',
      'conversations_by_hour',
      'conversations_by_channel',
    ],
  },
  {
    id: 'response',
    label: 'Response & resolution',
    metricIds: ['first_response_time', 'resolution_time_all'],
  },
  {
    // SLA and CSAT together: both answer "are we keeping the promise", one against a
    // target and one against the customer's own verdict.
    id: 'promises',
    label: 'SLA & satisfaction',
    metricIds: [
      'sla_compliance',
      'first_response_compliance',
      'resolution_compliance',
      'csat_satisfied_rate',
      'csat_rating_distribution',
    ],
  },
  {
    id: 'comparisons',
    label: 'Agents & channels',
    metricIds: ['workload_by_agent', 'performance_by_channel'],
  },
  {
    id: 'contacts',
    label: 'Contacts',
    metricIds: [
      'conversations_and_new_contacts',
      'new_contacts_by_channel',
      'new_vs_returning',
    ],
  },
  {
    id: 'calls',
    label: 'Calls',
    metricIds: [
      'calls_volume',
      'call_volume',
      'missed_calls',
      'time_to_answer',
      // Temporarily hidden — bring back later, with the widget it was parked alongside
      // (see the Operate template). Commenting it out here is what actually takes it out of
      // circulation: the library builds its list from THIS file, so a metric that is off
      // every page but still listed here is one click from coming back, which is not
      // "removed" by any reading a user would recognise.
      // 'time_to_answer_over_time',
      'longest_wait_time',
      'avg_call_duration',
      'shortest_call_duration',
      'longest_call_duration',
      'voip_calls_by_day_hour',
    ],
  },
  {
    id: 'deals',
    label: 'Deals',
    metricIds: [
      'sales_by_board',
      'win_rate',
      'avg_deal_size',
      'average_sales_cycle',
      'pipeline_value',
      'deal_stage_funnel',
    ],
  },
]

/**
 * The colour a widget's icon tile wears — one hue per KIND of widget.
 *
 * Four kinds, not eight: a number, a trend, a chart, a table. Colour and glyph then say the
 * same thing, which is the point — the tile is 32px and has room for one meaning. Colouring
 * by SUBJECT instead was the other candidate and it loses: the sticky heading and the filter
 * chip already name the subject, while the shape is the thing you are actually choosing
 * between inside a group ("Total calls" or "Call volume" — a number or a line).
 *
 * Intensity runs INVERSELY to how common the kind is. Numbers are 18 of the 33 rows, so
 * they take the palest tint (sky-200 is 1.16 against white, leaf-200 is 1.40) — put the
 * strongest colour on the commonest row and the list becomes a wall of it, with the charts
 * you are hunting for hidden inside it. This way the staple recedes and the five trends,
 * six charts and four tables are what the eye lands on.
 *
 * Grey is not in here on purpose: it is the ADDED state, and a live row must never wear it.
 */
export type ShapeTint = 'leaf' | 'sky' | 'purple' | 'peach'

/**
 * What shape a widget takes, by result type — the honest alternative to a live preview.
 * A shrunken chart of mock data would misrepresent both the size and the numbers; a shape
 * word and a size word can only ever be true, because the size comes from the same span
 * map the grid renders with.
 *
 * Icons are local (`svg icons/linear/`), rendered through Icon.vue's fuzzy match.
 */
export const SHAPE_BY_RESULT_TYPE: Record<
  string,
  { label: string; icon: string; tint: ShapeTint }
> = {
  value: { label: 'Number', icon: 'Hashtag', tint: 'sky' },
  // Leaf for the trend, which is also the colour the line itself is drawn in.
  time_series: { label: 'Over time', icon: 'ChartLine', tint: 'leaf' },
  breakdown: { label: 'Bar chart', icon: 'ChartBar', tint: 'purple' },
  histogram: { label: 'Distribution', icon: 'ChartColumn', tint: 'purple' },
  donut: { label: 'Donut', icon: 'ChartPie', tint: 'purple' },
  funnel: { label: 'Funnel', icon: 'Filter', tint: 'purple' },
  table: { label: 'Table', icon: 'Grid', tint: 'peach' },
  heatmap: { label: 'Heatmap', icon: 'Grid', tint: 'peach' },
}

/** How wide it will land, in words. Spans come from `@/lib/widgetLayout`. */
export function sizeLabel(span: number): string {
  if (span >= 12) return 'full width'
  if (span >= 6) return 'half width'
  return 'KPI card'
}
