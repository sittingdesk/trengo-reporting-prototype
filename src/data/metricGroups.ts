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
// team's registry, and this grouping is ours. The cost is that a new metric has to be
// added to a subject below, or it won't be offerable — which `orphanedMetricIds()` in the
// library's own dev check will tell you about.

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
      'avg_csat',
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
      'time_to_answer_over_time',
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
 * What shape a widget takes, by result type — the honest alternative to a live preview.
 * A shrunken chart of mock data would misrepresent both the size and the numbers; a shape
 * word and a size word can only ever be true, because the size comes from the same span
 * map the grid renders with.
 *
 * Icons are local (`svg icons/linear/`), rendered through Icon.vue's fuzzy match.
 */
export const SHAPE_BY_RESULT_TYPE: Record<string, { label: string; icon: string }> = {
  value: { label: 'Number', icon: 'Hashtag' },
  time_series: { label: 'Over time', icon: 'ChartLine' },
  breakdown: { label: 'Bar chart', icon: 'ChartBar' },
  histogram: { label: 'Distribution', icon: 'ChartColumn' },
  donut: { label: 'Donut', icon: 'ChartPie' },
  table: { label: 'Table', icon: 'Grid' },
  heatmap: { label: 'Heatmap', icon: 'Grid' },
  funnel: { label: 'Funnel', icon: 'Filter' },
}

/** How wide it will land, in words. Spans come from `@/lib/widgetLayout`. */
export function sizeLabel(span: number): string {
  if (span >= 12) return 'full width'
  if (span >= 6) return 'half width'
  return 'KPI card'
}
