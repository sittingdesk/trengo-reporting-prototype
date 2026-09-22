// Seeded mock-data generator for metric cards.
//
// ⚠️ Mock only: produces believable numbers that shift with the global filters
// (date range + channel + team) but are DETERMINISTIC for a given filter combo —
// so values don't flicker on re-render. Nothing here touches real data.
import { getLocalTimeZone, startOfMonth, type DateValue } from '@internationalized/date'
import type { MetricDef, FeatureFlag } from '@/data/metrics'
import { TEAMS } from '@/data/filters'
import { CHANNEL_INSTANCE_IDS, CATALOG } from '@/data/channelData'
import { fmtCount, fmtCurrency, fmtDays, fmtDuration, fmtPercent } from '@/lib/format'
import type { Direction } from '@/lib/delta'
import { BOARDS } from '@/data/boards'

export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'right'
  badge?: boolean // render cells as a muted pill (e.g. "In development")
  avatar?: boolean // prefix the cell with an initials avatar (e.g. agent names)
  sortable?: boolean // clickable header; sorts by `sortKey` (raw value)
  sortKey?: string // row key holding the raw sortable value (defaults to `key`)
  /** Definition shown behind an ⓘ on the header — a column needs to explain itself
   *  the same way a card does, since a table packs several metrics into one tile. */
  hint?: string
  /** Capability the column depends on; dropped from the table when it's off. Same
   *  rule as widget-level `requires`, one level down. */
  requires?: FeatureFlag
  /** Which way is good for this column, if it carries a period-over-period change.
   *  NO DIRECTION, NO DELTA — that is how a column opts out, and it's why Pipeline has
   *  none: it's a current stock, so "vs the previous period" has nothing to compare to.
   *  It lives here rather than on MetricDef because one table's columns need four
   *  different answers and there is nowhere above them to put it. Pairs with a
   *  `<key>Prev` raw value on each row. */
  direction?: Direction
  /** Makes this the table's initial ranking, in this direction. Without it the table
   *  falls back to the first sortable numeric column, descending. */
  defaultSort?: 'asc' | 'desc'
}
export interface TableData {
  columns: TableColumn[]
  rows: Record<string, string | number>[]
}

export interface MetricSample {
  value: number
  previous: number // comparable previous-period value (for the delta toggle)
  /** Supporting figure shown beside the big number on a value card (e.g. the raw
   *  count behind a rate). Pre-formatted — the card renders it verbatim. */
  secondary?: string
  series?: number[] // hourly buckets for histograms — "Today" (length 24)
  average?: number[] // average per hour across the period (length 24)
  labels?: string[] // x-axis labels (hours for histogram, dates for time series)
  // time series / grouped bars. `dashed` renders the line dashed; `csvKey` overrides
  // the CSV column header for that series.
  lines?: { name: string; tint: 'leaf' | 'sun'; data: number[]; dashed?: boolean; csvKey?: string }[]
  /** One extra tooltip line per breakdown bar, by index — the denominator a rate was
   *  computed from. A bar reading 62% is a finding at n=80 and noise at n=8, and nothing
   *  else on a bar chart can tell those apart. */
  context?: string[]
  table?: TableData
  heatmap?: number[][] // 7 rows (Mon–Sun) × 24 hour columns (voip_calls_by_day_hour)
  funnel?: { stage: string; count: number }[] // funnel stages (deal_stage_funnel)
  donut?: { label: string; value: number }[] // doughnut segments (new_vs_returning)
  /** A rate-over-a-volume pair for ComboChart: the line (0–1 rate) and the bars (counts).
   *  Kept OUT of `lines` on purpose — that array's members are peers drawn the same way on
   *  one axis, and these two are a subject and its weight on two axes with two units. */
  combo?: { score: { name: string; data: number[] }; volume: { name: string; data: number[] } }
  legendBelow?: boolean // render the line-chart legend below the chart (not header)
  /** Dashed reference line on a time chart (e.g. the period average). */
  referenceValue?: number
  /** A qualifier for the whole widget, shown top-right in the card header — how
   *  representative the number is, rather than another measurement. Header rather than a
   *  footnote so it costs the card no height. */
  note?: string
}

/** Mock agent roster for the "Workload by agent" table (large, to show scale). */
const AGENTS = [
  'Sanne Bakker', 'Daan Visser', 'Emma de Jong', 'Lucas Smit', 'Julia Mulder', 'Noah Peters',
  'Sophie Jansen', 'Finn de Boer', 'Mila van Dijk', 'Lars Bakker', 'Tess Vermeulen', 'Sem Kok',
  'Anna Meijer', 'Bram de Vries', 'Lotte Willems', 'Thijs Smit', 'Nina Hendriks', 'Ruben Maas',
  'Fleur Bos', 'Jesse van Leeuwen', 'Sara Peeters', 'Tim Dekker', 'Eva Scholten', 'Gijs Post',
]

/** Mock channels/inboxes for the "Performance by channel" table (Load more reveals all). */
const PERF_CHANNELS = [
  'Support Email',
  'Sales Email',
  'Main website',
  'Help center',
  'WhatsApp',
  'Instagram',
  'Facebook',
  'SMS',
]

// --- tiny seeded RNG (mulberry32) + string hash ---
function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const tz = getLocalTimeZone()

/** Days covered by the current date range (defaults to 7). */
export function rangeDays(start?: DateValue, end?: DateValue): number {
  if (!start || !end) return 7
  const ms = end.toDate(tz).getTime() - start.toDate(tz).getTime()
  return Math.max(1, Math.round(ms / 86_400_000) + 1)
}

const tsDayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
const tsMonthFmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' })

/**
 * Real, range-aware x-axis buckets for time-series charts. Granularity adapts to
 * the selected range so the chart stays readable:
 *   ≤ 31 days → daily · ≤ 180 days → weekly · otherwise → monthly.
 * Labels are actual dates (e.g. "Jun 26", or "Jul 25" for months).
 */
function timeSeriesBuckets(start?: DateValue, end?: DateValue): { labels: string[]; grain: 'day' | 'week' | 'month' } {
  if (!start || !end) return { labels: [], grain: 'day' }
  const days = rangeDays(start, end)
  const labels: string[] = []
  if (days <= 31) {
    for (let i = 0; i < days; i++) labels.push(tsDayFmt.format(start.add({ days: i }).toDate(tz)))
    return { labels, grain: 'day' }
  }
  if (days <= 180) {
    let d = start
    while (d.compare(end) <= 0) {
      labels.push(tsDayFmt.format(d.toDate(tz)))
      d = d.add({ weeks: 1 })
    }
    return { labels, grain: 'week' }
  }
  let d = startOfMonth(start)
  while (d.compare(end) <= 0) {
    labels.push(tsMonthFmt.format(d.toDate(tz)))
    d = d.add({ months: 1 })
  }
  return { labels, grain: 'month' }
}

/** A stable string identifying the current filter combination. */
export function filterSignature(
  dateRange: { start?: DateValue; end?: DateValue },
  channelIds: string[],
  teamIds: string[],
): string {
  const days = rangeDays(dateRange.start, dateRange.end)
  // Channel: all instances (or none) selected → 'all' (no filter); else the ids.
  const allChannels = channelIds.length === 0 || channelIds.length === CHANNEL_INSTANCE_IDS.length
  const ch = allChannels ? 'all' : [...channelIds].sort().join(',')
  const tm = [...teamIds].sort().join(',') || 'all'
  return `${days}|${ch}|${tm}`
}

// How much a filtered subset scales the magnitude (fewer selected → smaller).
function subsetFactor(selected: number, total: number): number {
  if (selected === 0) return 1 // empty = all
  return 0.25 + 0.75 * (selected / total)
}

function jitter(rng: () => number, spread = 0.15): number {
  return 1 + (rng() * 2 - 1) * spread
}

/** A bell-ish weight across the 24h day (busy midday, quiet at night). */
function hourWeight(h: number): number {
  return 0.15 + Math.exp(-Math.pow(h - 13, 2) / 40)
}

/** Heatmap row order — Monday first (matches the Voice reporting reference). */
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Deterministic mock sample for a metric under the current filters.
 * Rates (percentage) are not scaled by range/subset; counts/durations are.
 */
/**
 * One SLA verdict set, shared by the headline and the two per-target cards so the three
 * numbers reconcile on screen.
 *
 * Two rules from `sla-definitions-and-how.md` drive the shape:
 * - **Judged per ticket, then aggregated.** Filters change WHICH tickets are in the set,
 *   never a verdict — so everything here is met ÷ measured over the filtered population.
 *   Never an average of rates: a channel at 90% on 2,000 tickets beside one at 50% on 20
 *   is 89.6%, not 70%.
 * - **Each target has its own denominator.** AI-only tickets have no first-response
 *   target ("the first-response target doesn't apply to AI-only tickets") but ARE measured
 *   on resolution. Only channels with no policy drop out of both.
 *
 * The headline is strict — a ticket must meet EVERY target that applied — so it is
 * derived from the two, never generated independently. ⚠️ Mock assumes the two outcomes
 * are independent; real data will correlate (a swamped queue misses both at once).
 */
function slaCompliance(signature: string, days: number, chFactor: number, tmFactor: number) {
  const rng = mulberry32(hashString(`sla|${signature}`))
  const measured = Math.max(1, Math.round(1500 * Math.sqrt(days / 7) * chFactor * tmFactor))
  // ~8% of measured tickets are AI-only: resolution applies, first response doesn't.
  const frPop = Math.max(1, Math.round(measured * 0.92))
  const resPop = measured
  const frRate = Math.min(0.99, Math.max(0.5, 0.94 * jitter(rng, 0.04)))
  const resRate = Math.min(0.99, Math.max(0.5, 0.88 * jitter(rng, 0.05)))
  const frMet = Math.round(frPop * frRate)
  const resMet = Math.round(resPop * resRate)
  return {
    measured,
    frPop,
    frMet,
    resPop,
    resMet,
    metAll: Math.round(measured * frRate * resRate),
  }
}

/** Anchors for the voice queue, each matching the MetricDef it is named after. They live
 *  here because three cards read them and the numbers have to agree; the `base` on those
 *  defs is documentation now. */
const CALLS_PER_WEEK = 90 // calls_volume's base
const INBOUND_SHARE = 0.32 // per call_volume's inbound/outbound split
const ABANDON_RATE = 0.16 // missed_calls' base
const ANSWERED_QUEUE_WAIT = 42 // time_to_answer's base
/** Share of calls that carry a team at all. VoIP1 has no team signal anywhere, and ~47% of
 *  VoIP2 calls get none either (mostly unanswered) — so calls_by_team is roughly half of
 *  Total calls, and is supposed to look that way. */
const TEAM_COVERAGE = 0.5

/**
 * One queue, read by three cards: Missed calls, Time to answer and Average wait time.
 *
 * The two wait cards differ ONLY by population — one counts the callers an agent reached,
 * the other counts everyone who queued, including the ones who hung up. Generated
 * separately they would contradict each other in public: `metricValue` seeds per metric id
 * (`hashString(`${def.id}|${signature}`)`), so on some filter combination the blended
 * average would land BELOW the answered-only one, which says abandoned callers waited less
 * than answered ones — the opposite of what both tooltips claim. Seeded on
 * `voice|<signature>` instead, all three read one draw, and `blendedWait > answeredWait`
 * holds by construction rather than by luck.
 *
 * ⚠️ The DIRECTION is the registry's, not a guess: its spot check has abandoned callers
 * waiting almost twice as long as answered ones (179s vs 93s) — people wait, then give up.
 * So the blend runs above the answered-only figure, and the gap between the two cards is
 * the thing worth reading.
 *
 * Same arrangement as `slaCompliance` and `csatResponses` above.
 */
function voiceQueue(signature: string, days: number, chFactor: number, tmFactor: number) {
  const rng = mulberry32(hashString(`voice|${signature}`))
  const totalCalls = CALLS_PER_WEEK * Math.sqrt(days / 7) * chFactor * tmFactor
  // Every inbound call queues; outbound never does, which is also why the registry's wait
  // columns are simply NULL for them rather than filtered by call type.
  const inbound = Math.max(1, Math.round(totalCalls * INBOUND_SHARE))
  const abandoned = Math.max(0, Math.round(inbound * ABANDON_RATE * jitter(rng, 0.3)))
  const answered = Math.max(1, inbound - abandoned)
  const answeredWait = Math.max(5, Math.round(ANSWERED_QUEUE_WAIT * jitter(rng, 0.18)))
  // 1.7–2.3× the answered wait, straddling the registry's ~2×.
  const abandonedWait = Math.round(answeredWait * (1.7 + 0.6 * rng()))
  // A true blend over the whole queue, not an average of two averages — the same rule the
  // SLA helper follows, and the reason it can't drift from its parts.
  const blendedWait = Math.round((answeredWait * answered + abandonedWait * abandoned) / inbound)
  return { inbound, abandoned, answered, answeredWait, abandonedWait, blendedWait }
}

/**
 * Split a whole-period total across buckets so the parts sum to EXACTLY the whole.
 *
 * Rounding shares to integers always leaves the parts a little short of or over the total.
 * The difference goes onto the biggest bucket, where it is proportionally smallest.
 * Without this the bars sum to "about" the total, and "about" is what the shared draws
 * exist to rule out — a reader adding the bars up has to land on the number the card
 * beside it totals.
 */
function splitToBuckets(total: number, buckets: number, rng: () => number): number[] {
  const weights = Array.from({ length: buckets }, () => jitter(rng, 0.5))
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  const out = weights.map((w) => Math.max(0, Math.round((w / sum) * total)))
  const drift = total - out.reduce((a, b) => a + b, 0)
  if (drift !== 0) {
    const biggest = out.indexOf(Math.max(...out))
    out[biggest] = Math.max(0, out[biggest] + drift)
  }
  return out
}

/**
 * One set of survey responses, shared by both satisfaction widgets.
 *
 * A helper rather than two branches, for one reason: `metricValue` seeds itself per metric
 * (`hashString(`${def.id}|${signature}`)`), so two ids get two RNG streams — Customer
 * satisfaction would headline 84% while Satisfaction ratings' bars implied 81%, for the
 * same filters, on two pages of the same dashboard.
 *
 * Seeded on `csat|<signature>` so BOTH widgets draw the same responses: `slaCompliance()`'s
 * arrangement above, applied to the other split measure. One set, read twice, cannot drift.
 *
 * The shape is deliberately realistic — mostly 5s and 4s with a small unhappy tail, which
 * is exactly the case a bare average hides and the reason the distribution earns a widget.
 */
function csatResponses(signature: string, days: number, chFactor: number, tmFactor: number) {
  const rng = mulberry32(hashString(`csat|${signature}`))
  const responses = Math.max(1, Math.round(120 * Math.sqrt(days / 7) * chFactor * tmFactor))
  // Share of responses per rating, 5★ → 1★. Sums to 1.
  const shape = [0.62, 0.21, 0.08, 0.05, 0.04].map((w) => Math.max(0.01, w * jitter(rng, 0.25)))
  const sum = shape.reduce((a, b) => a + b, 0)
  const counts = shape.map((w) => Math.max(0, Math.round((w / sum) * responses)))
  const total = counts.reduce((a, b) => a + b, 0) || 1
  const satisfied = counts[0] + counts[1] // 5★ + 4★
  // Response rate = answered ÷ surveys SENT — a different denominator from the satisfaction
  // rate (rated 4–5 ÷ answered), which is why it sits in the ratings card's header rather
  // than beside a figure: two denominators side by side read as one.
  // ⚠️ registry `csat_response_rate` is SAFE_DIVIDE(..., <OFFERED_COUNT_TBD>) — the
  // denominator is undefined, so this figure is illustrative only.
  const offered = Math.max(
    total,
    Math.round(total / Math.min(0.9, Math.max(0.15, 0.34 * jitter(rng, 0.2)))),
  )
  return { counts, total, satisfied, offered, rate: satisfied / total }
}

export function metricValue(
  def: MetricDef,
  signature: string,
  dateRange?: { start?: DateValue; end?: DateValue },
  // Unused while no metric declares break-downs (the by-team wait-time view was the last
  // one). Kept because the measure/break-down model is intact — any multi-view metric
  // starts passing this again.
  _dimensionId?: string,
): MetricSample {
  const seed = hashString(`${def.id}|${signature}`)
  const rng = mulberry32(seed)
  const [daysStr, ch, tm] = signature.split('|')
  const days = Number(daysStr) || 7

  const chFactor = subsetFactor(ch === 'all' ? 0 : ch.split(',').length, CHANNEL_INSTANCE_IDS.length)
  const tmFactor = subsetFactor(tm === 'all' ? 0 : tm.split(',').length, TEAMS.length)
  const base = def.base ?? 0

  // Extremes over a window behave differently from averages: a MAX creeps up and a MIN
  // creeps down as the window widens (more calls = more chances for an outlier). Averages
  // stay flat — they fall through to the duration branch below.
  if (def.id === 'longest_call_duration' || def.id === 'shortest_call_duration') {
    const widen = Math.sqrt(days / 7)
    const isMax = def.id === 'longest_call_duration'
    const scale = isMax ? 0.85 + 0.3 * widen : 1.15 - 0.25 * Math.min(widen, 2.2)
    const at = (r: () => number) =>
      Math.max(isMax ? 60 : 3, Math.round(base * scale * chFactor * tmFactor * jitter(r, 0.25)))
    return { value: at(rng), previous: at(rng) }
  }

  // Longest wait: a MAX, so unlike an average it does grow with a longer window (more
  // calls → higher peak) — but sub-linearly. Registry: voip_longest_wait_time.
  if (def.id === 'longest_wait_time') {
    const scale = 0.85 + 0.3 * Math.sqrt(days / 7)
    const value = Math.max(30, Math.round(base * scale * chFactor * tmFactor * jitter(rng, 0.3)))
    const previous = Math.max(30, Math.round(base * scale * chFactor * tmFactor * jitter(rng, 0.3)))
    return { value, previous }
  }

  // Time to answer, per day. Durations don't scale with the range length, so buckets only
  // jitter around the base. The base MUST match `time_to_answer` — this is the same
  // measure at a finer grain, so a visible gap between the KPI and the chart would be a
  // contradiction, not a nuance. (An earlier 0.65 factor modelled the registry's ~35% gap
  // against the by-team view, which no longer exists.)
  if (def.id === 'time_to_answer_over_time') {
    const bucketed = timeSeriesBuckets(dateRange?.start, dateRange?.end)
    const labels = bucketed.labels.length ? bucketed.labels : ['—']
    const tsRng = mulberry32(hashString(`${def.id}|${signature}`))
    const data = labels.map(() =>
      Math.max(5, Math.round(base * tmFactor * jitter(tsRng, 0.45))),
    )
    const avg = Math.round(data.reduce((a, b) => a + b, 0) / data.length)
    return {
      value: avg,
      previous: avg * jitter(rng, 0.2),
      labels,
      lines: [{ name: 'Avg wait', tint: 'leaf', data, csvKey: 'avg_wait_seconds' }],
      referenceValue: avg,
    }
  }

  // Histograms: 24 hourly buckets — "Today" plus a lower "Average" curve.
  if (def.resultType === 'histogram') {
    const series: number[] = []
    const average: number[] = []
    const labels: string[] = []
    let total = 0
    for (let h = 0; h < 24; h++) {
      const shape = base * hourWeight(h) * chFactor * tmFactor
      const today = Math.max(0, Math.round(shape * jitter(rng, 0.25)))
      const avg = Math.max(0, Math.round(shape * 0.55 * jitter(rng, 0.12)))
      series.push(today)
      average.push(avg)
      labels.push(`${String(h).padStart(2, '0')}:00`)
      total += today
    }
    const prevTotal = total * jitter(rng, 0.2)
    return { value: total, previous: prevTotal, series, average, labels }
  }

  // Heatmap: day-of-week (Mon–Sun) × hour-of-day counts. Raw totals for the period —
  // all Mondays combined, all Tuesdays, etc. Weekends run much quieter. Scaled like the
  // other call counts (√ range) so it stays coherent with the Total calls KPI.
  if (def.resultType === 'heatmap') {
    const rangeScale = Math.sqrt(days / 7)
    const grid: number[][] = []
    let total = 0
    for (let d = 0; d < 7; d++) {
      // Sat/Sun much quieter, but not dead — at this volume a harsher factor rounds the
      // whole weekend to zero, which reads as a broken widget rather than a quiet one.
      const dayFactor = d >= 5 ? 0.35 : 1
      const row: number[] = []
      for (let h = 0; h < 24; h++) {
        const shape = (base / 20) * hourWeight(h) * dayFactor * chFactor * tmFactor * rangeScale
        const n = Math.max(0, Math.round(shape * jitter(rng, 0.5)))
        row.push(n)
        total += n
      }
      grid.push(row)
    }
    return { value: total, previous: total * jitter(rng, 0.2), heatmap: grid }
  }

  // Satisfaction over time — the score as a line, the survey volume behind it as bars.
  //
  // Every number here is the shared draw split into buckets, so the card cannot contradict
  // its neighbours: the bars sum to the response count the ratings chart is built from, and
  // the line's VOLUME-WEIGHTED mean is exactly the rate the Overview KPI shows. That second
  // one is why the satisfied responses are split rather than the rate itself — dividing
  // per-day satisfied by per-day volume makes Σsatisfied/Σvolume identical to the period
  // rate by construction, where scaling a jittered rate can only get close.
  if (def.id === 'csat_score_over_time') {
    const { total, satisfied } = csatResponses(signature, days, chFactor, tmFactor)
    const bucketed = timeSeriesBuckets(dateRange?.start, dateRange?.end)
    const labels = bucketed.labels.length ? bucketed.labels : ['—']
    const tsRng = mulberry32(
      hashString(`${def.id}|ts|${dateRange?.start?.toString() ?? ''}|${signature}`),
    )
    const volume = splitToBuckets(total, labels.length, tsRng)
    // Satisfied responses per bucket, proportional to that bucket's volume and never more
    // than it — a day cannot have more happy customers than customers.
    const happy = splitToBuckets(satisfied, labels.length, tsRng).map((v, i) =>
      Math.min(v, volume[i]),
    )
    // Clamping above can leave some satisfied responses unplaced; put them wherever there
    // is still room, or the weighted mean drifts below the KPI.
    let spare = satisfied - happy.reduce((a, b) => a + b, 0)
    for (let i = 0; i < happy.length && spare > 0; i++) {
      const room = volume[i] - happy[i]
      const take = Math.min(room, spare)
      happy[i] += take
      spare -= take
    }
    return {
      value: total, // drives the empty state; the delta is suppressed for a two-series chart
      previous: total * jitter(rng, 0.2),
      labels,
      combo: {
        score: { name: 'Score', data: volume.map((v, i) => (v > 0 ? happy[i] / v : 0)) },
        volume: { name: 'Surveys', data: volume },
      },
    }
  }

  // Surveys received, per day. The bars sum EXACTLY to the response count the ratings chart
  // beside it is built from — they are one measure at two grains, on one page, so a reader
  // who adds the bars up has to land on the number the distribution totals.
  //
  // That is why it takes the shared draw's `total` and splits it, rather than falling
  // through to the generic time_series branch below: that one derives its own volume from
  // `base × days`, which would put two different survey counts on the same page.
  if (def.id === 'csat_surveys_received') {
    const { total } = csatResponses(signature, days, chFactor, tmFactor)
    const bucketed = timeSeriesBuckets(dateRange?.start, dateRange?.end)
    const labels = bucketed.labels.length ? bucketed.labels : ['—']
    // Re-seeded on the window so a different range draws a different shape, the same way
    // the generic branch does.
    const tsRng = mulberry32(
      hashString(`${def.id}|ts|${dateRange?.start?.toString() ?? ''}|${signature}`),
    )
    const data = splitToBuckets(total, labels.length, tsRng)
    return {
      value: total,
      previous: total * jitter(rng, 0.2),
      labels,
      lines: [{ name: 'Surveys received', tint: 'leaf', data, csvKey: 'surveys_received' }],
    }
  }

  // Time series: Created vs Closed over the period, bucketed by real dates
  // (daily / weekly / monthly depending on the selected range length).
  if (def.resultType === 'time_series') {
    const bucketed = timeSeriesBuckets(dateRange?.start, dateRange?.end)
    const labels =
      bucketed.labels.length > 0
        ? bucketed.labels
        : Array.from({ length: Math.min(12, Math.max(5, days)) }, (_, i) => `Day ${i + 1}`)
    const count = labels.length
    // Re-seed with the actual window so different date ranges show a different trend.
    const tsRng = mulberry32(hashString(`${def.id}|ts|${dateRange?.start?.toString() ?? ''}|${signature}`))
    // Volume per bucket = whole-period volume shared across the buckets, so a
    // longer range (fewer, larger buckets) still reads as more per point.
    const perBucket = (base * chFactor * tmFactor * days) / count
    const created: number[] = []
    const closed: number[] = []
    for (let i = 0; i < count; i++) {
      const c = Math.max(0, Math.round(perBucket * jitter(tsRng, 0.3)))
      created.push(c)
      closed.push(Math.max(0, Math.round(c * 0.9 * jitter(tsRng, 0.15))))
    }
    // Conversations (solid) + New contacts (dashed) — legend below, totals subtitle.
    if (def.id === 'conversations_and_new_contacts') {
      const newc = created.map((c) => Math.max(0, Math.round(c * 0.3 * jitter(tsRng, 0.25))))
      const convTotal = created.reduce((a, b) => a + b, 0)
      const newTotal = newc.reduce((a, b) => a + b, 0)
      return {
        value: convTotal + newTotal, // empty only when BOTH series are zero
        previous: (convTotal + newTotal) * jitter(rng, 0.2),
        labels,
        legendBelow: true,
        lines: [
          { name: 'Tickets', tint: 'leaf', data: created, csvKey: 'tickets_created' },
          { name: 'New contacts', tint: 'sun', data: newc, dashed: true, csvKey: 'new_contacts' },
        ],
      }
    }
    // Inbound vs Outbound calls per bucket, stacked (outbound the larger share,
    // per the Voice Reporting reference). Rendered as stacked bars via metric.stacked.
    if (def.id === 'call_volume') {
      const inbound = created.map((c) => Math.max(0, Math.round(c * 0.35 * jitter(tsRng, 0.35))))
      const outbound = created.map((c) => Math.max(0, Math.round(c * 0.75 * jitter(tsRng, 0.35))))
      const inTotal = inbound.reduce((a, b) => a + b, 0)
      const outTotal = outbound.reduce((a, b) => a + b, 0)
      return {
        value: inTotal + outTotal, // empty only when both directions are zero
        previous: (inTotal + outTotal) * jitter(rng, 0.2),
        labels,
        lines: [
          { name: 'Inbound', tint: 'leaf', data: inbound },
          { name: 'Outbound', tint: 'sun', data: outbound },
        ],
      }
    }
    const total = created.reduce((a, b) => a + b, 0)
    // Single-line "flow" metrics (e.g. Conversations created) vs the two-line
    // Created-vs-closed comparison.
    const lines =
      def.id === 'created_vs_closed'
        ? [
            { name: 'Created', tint: 'leaf' as const, data: created },
            { name: 'Closed', tint: 'sun' as const, data: closed },
          ]
        : [{ name: 'Tickets', tint: 'leaf' as const, data: created }]
    return { value: total, previous: total * jitter(rng, 0.2), labels, lines }
  }

  // How many people answered at all — the qualifier that used to sit in the ratings card's
  // header as a note. Reads the shared draw, so promoting it to a card can't put two
  // different response rates on one page.
  //
  // No `secondary`, and this is the one rate in the app where leaving the denominator off
  // is the honest choice rather than a concession. Missed calls shows "5 of 29 inbound" and
  // Win rate "82 of 240 decided deals" because a percentage without its denominator is
  // unreadable — but here the denominator IS the undefined thing. Printing "120 of 316
  // sent" would invent precision about a concept the registry has not defined. The caveat
  // carries it instead.
  if (def.id === 'csat_response_rate') {
    const { total, offered } = csatResponses(signature, days, chFactor, tmFactor)
    const rate = total / offered
    // ±8%, not ±5%: FLAT_BAND_PCT is 5, so a prior drawn inside ±5% can only ever render
    // grey. Same fix as the satisfied-rate branch below.
    return { value: rate, previous: rate * jitter(rng, 0.08) }
  }

  // The satisfaction rate — the verdict, on Overview. A number and its denominator; the
  // spread is the other widget's job. Only `previous` comes from this metric's own rng,
  // since only the CURRENT period has to agree across the two cards.
  if (def.id === 'csat_satisfied_rate') {
    const { satisfied, total, rate } = csatResponses(signature, days, chFactor, tmFactor)
    return {
      value: rate,
      // ±8%, not the ±5% this branch inherited. FLAT_BAND_PCT is 5, so a prior drawn
      // within ±5% can only ever render a grey delta — the card would look broken in the
      // same way win_rate did when its clamp pinned it. 8 lets green and red be reached
      // while satisfaction stays the slow-moving number it is.
      previous: rate * jitter(rng, 0.08),
      // No trailing noun, for the reason sla_compliance has none: at 4-up the card is
      // 213px wide at 1280, and "103 of 120 responses" wraps below the number. The floor
      // of 160px absorbs it so the row doesn't break, but the card then reads as two lines
      // where its neighbours read as one. The noun is in the tooltip.
      secondary: `${fmtCount(satisfied)} of ${fmtCount(total)}`,
    }
  }

  // The ratings themselves — the shape, on Improve. NO `secondary`, deliberately: that is
  // the field that switches MetricBox's breakdown headline on, and a 36px number here would
  // reprint the Overview card on another page. The bars are the content; the response rate
  // says how much they're worth.
  if (def.id === 'csat_rating_distribution') {
    const { counts, total } = csatResponses(signature, days, chFactor, tmFactor)
    return {
      // `value` is the response count, which drives the empty state rather than any
      // rendered figure — a breakdown shows no headline and no delta. `previous` is
      // required by the type and goes nowhere; it stays on this metric's own rng.
      value: total,
      previous: total * jitter(rng, 0.15),
      // The `note: 'Response rate 38%'` that used to sit in this card's header is gone: it
      // was a stand-in for a card that didn't exist, and now one does, two cards up on the
      // same page. Printing the figure twice is the duplication the satisfaction split
      // spent effort removing. Cost, stated: added to a report WITHOUT the rate card, this
      // chart no longer says how representative it is — the bar counts still show n, and
      // the rate is one row away in the library.
      labels: ['5 ★', '4 ★', '3 ★', '2 ★', '1 ★'],
      series: counts,
    }
  }

  // The three sentiment buckets — the SAME responses as every other CSAT widget, merged
  // from five ratings into three.
  //
  // The invariant here is stronger than the by-channel card's, because there is nothing to
  // reconcile: `positive` IS `satisfied`, the exact variable csat_satisfied_rate returns on
  // Overview and csat_score_over_time plots as its line. So four widgets across two pages
  // cannot disagree, at any filter combination, by construction rather than by checking.
  //
  // ⚠️ The 4–5 / 3 / 1–2 split assumes the 1–5 scale. It is not a guess — Freshdesk splits
  // a 5-point scale 2-1-2 and Gorgias scores "4 or 5" — but on a thumbs workspace there are
  // only two buckets and the neutral row has no source. See the metric's own comment.
  //
  // Must sit above the generic `breakdown` fallback, which spreads a base across channels.
  if (def.id === 'csat_sentiment_breakdown') {
    const { counts, total } = csatResponses(signature, days, chFactor, tmFactor)
    return {
      // Drives the empty state; a breakdown renders no headline and no delta. The component
      // derives each share from the counts, so nothing here needs to carry a percentage.
      value: total,
      previous: total * jitter(rng, 0.15),
      // Order is the contract SentimentBreakdown reads its tone and icon from — positive,
      // neutral, negative, always. Not sorted: these are an ordinal scale, and ranking them
      // by size would put "negative" first on a good week and last on a bad one.
      labels: ['Positive', 'Neutral', 'Negative'],
      series: [counts[0] + counts[1], counts[2], counts[3] + counts[4]],
    }
  }

  // Satisfaction per channel — the SAME responses as the ratings chart beside it and the
  // headline rate on Overview, re-cut by channel instead of by rating.
  //
  // The invariant that makes it honest: the per-channel response counts sum to `total` and
  // the per-channel satisfied counts sum to `satisfied`, so Σsatisfied ÷ Σresponses is the
  // headline rate EXACTLY. That is the rule the SLA-per-target work wrote down — sum
  // numerators and denominators, never average the rates — and it is what lets a channel at
  // 62% sit beside one at 91% without either contradicting the 84% two cards up.
  //
  // Must sit above the generic `breakdown` fallback, which spreads a base across the same
  // channels as a COUNT and would quietly turn these rates into volumes.
  if (def.id === 'csat_by_channel') {
    const { total, satisfied } = csatResponses(signature, days, chFactor, tmFactor)
    const cats =
      ch === 'all'
        ? CATALOG
        : CATALOG.filter((c) => c.instances.some((i) => ch.split(',').includes(i.id)))
    // Its own stream, so adding this card can't shift the ratings bars beside it.
    const chRng = mulberry32(hashString(`csat-ch|${signature}`))
    const responses = splitToBuckets(total, cats.length, chRng)
    // Vary the rate per channel by weighting an ALLOCATION, never by drawing a rate — draw
    // one and the parts stop adding up to the whole.
    //
    // And allocate the UNHAPPY responses, not the happy ones. Weighting the satisfied side
    // overflows on a base rate this high — 86% × a 1.3 weight is over 100%, so the per
    // channel ceiling fires and saturates that channel at a 28-of-28 bar, which reads as
    // placeholder data rather than as a good channel. Dissatisfaction is the scarce
    // quantity here (17 of 120), so spreading THAT is both the realistic model and the one
    // that cannot overflow. A 100% bar stays reachable at genuinely small n, which is
    // correct: with five responses, five happy ones is an ordinary Tuesday.
    const unhappyTotal = total - satisfied
    // 0.7 rather than a polite 0.3: at these volumes dissatisfaction is ~17 responses over
    // four channels, and a narrow jitter draws four bars within three points of each other.
    // A chart whose bars are all the same height demonstrates nothing and reads as
    // placeholder data — the same reason Calls by team splits its teams unevenly on
    // purpose. Real channel satisfaction varies more than this, not less.
    const raw = responses.map((n) => n * jitter(chRng, 0.7))
    const rawSum = raw.reduce((a, b) => a + b, 0) || 1
    const unhappy = raw.map((v, i) =>
      Math.min(responses[i], Math.round((v / rawSum) * unhappyTotal)),
    )
    // Rounding and the per-channel ceiling each lose a response or two. Hand the remainder
    // back to whichever channels still have room, so both sums hold exactly rather than
    // approximately — "about" is what the shared draws exist to rule out.
    let drift = unhappyTotal - unhappy.reduce((a, b) => a + b, 0)
    for (let pass = 0; drift !== 0 && pass <= total; pass++) {
      for (let i = 0; i < unhappy.length && drift !== 0; i++) {
        if (drift > 0 && unhappy[i] < responses[i]) {
          unhappy[i]++
          drift--
        } else if (drift < 0 && unhappy[i] > 0) {
          unhappy[i]--
          drift++
        }
      }
    }
    const happy = responses.map((n, i) => n - unhappy[i])
    const rows = cats
      .map((c, i) => ({ label: c.label, n: responses[i], happy: happy[i] }))
      // A GROUP BY emits no row for a channel nobody answered on, and a 0% bar there would
      // claim everyone was unhappy — the same "No policy, not 0%" rule the channel table
      // follows. Absent is the truthful rendering of absent.
      .filter((r) => r.n > 0)
      .sort((a, b) => a.happy / a.n - b.happy / b.n) // worst first — this page is a queue
    return {
      // Drives the empty state only; a breakdown renders no headline and no delta.
      value: total,
      previous: total * jitter(rng, 0.15),
      labels: rows.map((r) => r.label),
      series: rows.map((r) => r.happy / r.n),
      // The denominator per bar, so a 50% built on four responses can't pass for a finding.
      context: rows.map((r) => `${r.happy} of ${r.n} responses`),
    }
  }

  // Calls per team — a COUNT, so unlike the wait durations it grows with the window.
  //
  // Deliberately reconciles with NOTHING: the registry says "Totals will not match
  // voip_total_calls: VoIP1 volume is fully excluded (no team signal exists for it), and
  // ~47% of VoIP2 calls get no team either (mostly unanswered — expected)." So the bars are
  // modelled at roughly half of `calls_volume`, and the card's caveat says why. Making them
  // add up to Total calls would be the comfortable lie.
  //
  // Must sit above the generic breakdown fallback, which spreads a base across CHANNELS.
  if (def.id === 'calls_by_team') {
    const attributed = base * TEAM_COVERAGE * Math.sqrt(days / 7) * chFactor * tmFactor
    const teams = tm === 'all' ? TEAMS : TEAMS.filter((t) => tm.split(',').includes(t.id))
    const rows = teams
      .map((t) => ({
        label: t.label,
        // Uneven on purpose — an even split across five teams reads as placeholder data.
        value: Math.max(1, Math.round((attributed / teams.length) * jitter(rng, 0.6))),
      }))
      .sort((a, b) => b.value - a.value) // busiest team first, as the channel table ranks
    const total = rows.reduce((a, r) => a + r.value, 0)
    return {
      value: total,
      previous: total * jitter(rng, 0.2),
      labels: rows.map((r) => r.label),
      series: rows.map((r) => r.value),
    }
  }

  // Breakdown bars: one bar per channel category (WhatsApp / Live chat / Email / Voice).
  if (def.resultType === 'breakdown') {
    const labels = CATALOG.map((c) => c.label)
    const perChannel = (base * chFactor * tmFactor * Math.sqrt(days / 7)) / labels.length
    const series = labels.map(() => Math.max(0, Math.round(perChannel * jitter(rng, 0.5))))
    const total = series.reduce((a, b) => a + b, 0)
    return { value: total, previous: total * jitter(rng, 0.2), labels, series }
  }

  // Donut: share of a total across a few segments (New vs Returning).
  if (def.resultType === 'donut') {
    const total = base * chFactor * tmFactor * Math.sqrt(days / 7)
    const newC = Math.max(0, Math.round(total * 0.6 * jitter(rng, 0.15)))
    const ret = Math.max(0, Math.round(total * 0.4 * jitter(rng, 0.15)))
    return {
      value: newC + ret,
      previous: (newC + ret) * jitter(rng, 0.2),
      donut: [
        { label: 'New', value: newC },
        { label: 'Returning', value: ret },
      ],
    }
  }

  // Funnel: counts per pipeline stage, descending.
  if (def.resultType === 'funnel') {
    const stages = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won']
    const top = base * chFactor * tmFactor * Math.sqrt(days / 7)
    const rates = [1, 0.62, 0.4, 0.26, 0.16] // stage-to-stage drop-off
    const funnel = stages.map((stage, i) => ({
      stage,
      count: Math.max(0, Math.round(top * rates[i] * jitter(rng, 0.12))),
    }))
    const value = funnel.reduce((a, s) => a + s.count, 0)
    return { value, previous: value * jitter(rng, 0.2), funnel }
  }

  // Tables: per-agent / per-channel / per-board rows (pre-formatted, filter-scaled).
  if (def.resultType === 'table') {
    return {
      value: 0,
      previous: 0,
      table: tableData(def.id, rng, chFactor, tmFactor, days),
      // No header note. It used to say "Amounts in each board's currency" — the fact now
      // lives in the two money columns' own ⓘ hints, which is where a column-specific
      // caveat belongs and where the rest of the app already puts definitions.
    }
  }

  // SLA compliance: met ÷ measured. The supporting figure carries the DENOMINATOR,
  // which matters more here than on most rates — tickets on channels without a policy
  // are excluded from it entirely, so "85%" alone hides how much was actually judged.
  // Must sit before the percentage branch, which clamps to 0.4–0.99 and ignores counts.
  if (def.id.startsWith('sla_') || def.id.endsWith('_compliance')) {
    const c = slaCompliance(signature, days, chFactor, tmFactor)
    const pick =
      def.id === 'first_response_compliance'
        ? { met: c.frMet, pop: c.frPop }
        : def.id === 'resolution_compliance'
          ? { met: c.resMet, pop: c.resPop }
          : { met: c.metAll, pop: c.measured }
    return {
      value: pick.met / pick.pop,
      previous: (pick.met / pick.pop) * jitter(rng, 0.06),
      // No trailing noun: at 4-up width "of 1,500 tickets" wraps to a second line and
      // makes this the only card in its row that isn't 160px tall. The title and the
      // tooltip already say these are tickets.
      secondary: `${fmtCount(pick.met)} of ${fmtCount(pick.pop)}`,
    }
  }

  // Missed calls: a RATE (missed ÷ inbound) with the raw count as the supporting
  // figure — a bare count can't be judged and grows with the date range. Denominator is
  // inbound only: outbound calls can't be "missed". Must sit before the percentage
  // branch below, which clamps to 0.4–0.99 and would distort a ~16% rate.
  if (def.id === 'missed_calls') {
    // Reads the shared queue so its count and the two wait cards' populations add up:
    // answered + missed = queued, on screen, at every filter combination.
    const { inbound, abandoned } = voiceQueue(signature, days, chFactor, tmFactor)
    const prevMissed = Math.max(0, Math.round(inbound * base * jitter(rng, 0.3)))
    return {
      value: abandoned / inbound,
      previous: prevMissed / inbound,
      secondary: `${fmtCount(abandoned)} of ${fmtCount(inbound)} inbound`,
    }
  }

  // The two queue-wait cards. Same queue, two populations — the whole reason they're two
  // cards, and the reason they share one draw (see voiceQueue).
  // Each briefly carried its population as a supporting figure ("24 answered" / "29
  // queued") so the pair read apart without a tooltip. Removed: both were specified as a
  // single value, and the figure was a differentiator nobody asked for. They are told apart
  // by title and tooltip, like every other pair on the page.
  if (def.id === 'time_to_answer' || def.id === 'average_wait_time') {
    const q = voiceQueue(signature, days, chFactor, tmFactor)
    const value = def.id === 'time_to_answer' ? q.answeredWait : q.blendedWait
    return { value, previous: value * jitter(rng, 0.18) }
  }

  // Share of DECIDED deals that were won — open deals aren't counted, which the caveat
  // already promises and nothing was honouring. Needs its own branch for the same reason
  // missed_calls does: the generic clamp below would distort it. Until this existed,
  // win_rate rendered exactly 40% under every filter with a permanent 0.0% delta, because
  // base 0.34 × ±6% can never clear the old 0.4 floor.
  if (def.id === 'win_rate') {
    const decided = Math.max(1, Math.round(240 * Math.sqrt(days / 7) * chFactor * tmFactor))
    const won = Math.max(0, Math.round(decided * base * jitter(rng, 0.18)))
    const prevWon = Math.max(0, Math.round(decided * base * jitter(rng, 0.18)))
    return {
      value: won / decided,
      previous: prevWon / decided,
      secondary: `${fmtCount(won)} of ${fmtCount(decided)} decided deals`,
    }
  }

  // Percentages / rates: bounded, not scaled by volume.
  // The floor is 0.05, not 0.4. Every rate that belongs near the top of its range is
  // intercepted above (sla_*, *_compliance, missed_calls, win_rate, csat_satisfied_rate),
  // so nothing reaches this clamp today — but a 0.4 floor silently pins any future
  // sub-40% rate to exactly 40%, which is how win_rate was broken.
  if (def.unit === 'percentage') {
    const value = Math.min(0.99, Math.max(0.05, base * jitter(rng, 0.06)))
    const previous = Math.min(0.99, Math.max(0.05, base * jitter(rng, 0.06)))
    return { value, previous }
  }

  // Durations (seconds) & money (averages/stocks like deal size or pipeline value):
  // vary per filter signature, but don't scale with range length.
  if (def.unit !== 'count') {
    const value = Math.max(1, base * jitter(rng, 0.18))
    const previous = Math.max(1, base * jitter(rng, 0.18))
    return { value, previous }
  }

  // Counts: scale with range length + selected channels/teams.
  const rangeFactor = Math.sqrt(days / 7)
  const value = Math.max(0, base * rangeFactor * chFactor * tmFactor * jitter(rng, 0.15))
  const previous = Math.max(0, base * rangeFactor * chFactor * tmFactor * jitter(rng, 0.15))
  return { value, previous }
}

/** Build mock table rows for a table metric, scaled by the active filters. */
function tableData(
  id: string,
  rng: () => number,
  chFactor: number,
  tmFactor: number,
  days: number,
): TableData {
  const rangeFactor = Math.sqrt(days / 7)
  const scale = rangeFactor * chFactor * tmFactor

  // Sortable numeric/duration column: display formatted, keep a `<key>Raw` number.
  const num = (key: string, raw: number, fmt: (n: number) => string) => ({
    [key]: fmt(raw),
    [`${key}Raw`]: Math.round(raw),
  })

  if (id === 'sales_by_board') {
    return {
      columns: [
        { key: 'board', label: 'Board', align: 'left', sortable: true },
        {
          key: 'win',
          label: 'Win rate',
          align: 'left',
          sortable: true,
          sortKey: 'winRaw',
          // The default ranking, and the only column that can carry one honestly: it's
          // unitless, so ordering by it makes no currency claim. Sorting by Pipeline
          // would put €248k above $310k and assert a comparison that doesn't exist.
          defaultSort: 'desc',
          direction: 'up_good',
          hint: 'Share of this board’s decided deals that were won. Open deals aren’t counted.',
        },
        {
          key: 'deal',
          label: 'Avg. deal',
          align: 'left',
          sortable: true,
          sortKey: 'dealRaw',
          // Shown, not judged: a rise can be a mix shift toward slower enterprise deals
          // and a fall can be healthy volume growth, so the movement is a fact worth
          // showing and the colour is a claim we can't make.
          direction: 'neutral',
          hint: 'Average value of a deal won in this period, in this board’s own currency.',
        },
        {
          key: 'pipeline',
          label: 'Pipeline',
          align: 'left',
          sortable: true,
          sortKey: 'pipelineRaw',
          // No `direction`, so no change column — and that is the point. This is a
          // CURRENT STOCK, not a flow over the selected range ("not affected by the date
          // range", per the metric's own caveat), so a period-over-period change has
          // nothing to compare against. The hint says so, which turns an apparent
          // omission into a statement.
          hint: 'Value of all deals currently open on this board, in its own currency. A current total rather than a period measure, so it has no period-over-period change. Boards are never converted or added together.',
        },
        {
          key: 'cycle',
          label: 'Cycle',
          align: 'left',
          sortable: true,
          sortKey: 'cycleRaw',
          direction: 'down_good', // a shorter cycle is the good direction
          hint: 'Average days from creation to close, across won and lost deals.',
        },
      ],
      // Seeded per BOARD id, not per row index: a board's numbers then stay put when the
      // table is re-sorted, and adding a board doesn't reshuffle the others.
      rows: BOARDS.map((b) => {
        const r = mulberry32(hashString(`sales_by_board|${b.id}|${chFactor}|${tmFactor}|${days}`))
        // A board-specific bias so the rows differ by more than noise — that difference is
        // the whole reason the widget exists. Range 0.55–1.45 rather than 0.6–2.0: the
        // wider one put every board's win rate in the high forties to sixties, which reads
        // as a fantasy sales team and undersells the spread between boards.
        const bias = 0.55 + 0.9 * r()
        const win = Math.min(0.75, Math.max(0.08, 0.34 * bias * jitter(r, 0.2)))
        return {
          board: b.label,
          win: fmtPercent(win),
          // NOT via num(): it rounds, so a 0–1 rate would collapse to 0 and sorting would
          // die. Same trick channelCompliance uses — rank on whole percents.
          winRaw: Math.round(win * 100),
          ...num('deal', 3450 * bias * jitter(r, 0.2), (n) => fmtCurrency(n, b.currency)),
          // The one column that answers to the filter bar: deals carry a channel and an
          // owner, so narrowing either narrows the open pipeline. Rates and cycle lengths
          // describe the deals that are there, so they don't scale with subset size.
          ...num('pipeline', 248000 * bias * chFactor * tmFactor * jitter(r, 0.25), (n) =>
            fmtCurrency(n, b.currency),
          ),
          ...num('cycle', 18 * bias * jitter(r, 0.2), fmtDays),
          // Previous-period values for the three columns that carry a change. Drawn from
          // the SAME rng and AFTER the current values, so adding them moved no number
          // already on the page — a seeded generator only stays comparable if new draws
          // go on the end. Pipeline gets none: see its column's comment.
          //
          // ⚠️ Each must be in the SAME UNITS as the value it's compared against, which is
          // the column's sortKey — so `winPrev` is whole percent, matching `winRaw`, not
          // the 0–1 rate `win` is. It was the rate first, and the table read "9123.4%".
          //
          // ±12%: enough that boards differ and some changes land inside the 5% dead band
          // (which is the band doing its job, not a bug), without the ±25% that made every
          // quarter look like a crisis.
          winPrev: Math.round(win * jitter(r, 0.12) * 100),
          dealPrev: 3450 * bias * jitter(r, 0.12),
          cyclePrev: 18 * bias * jitter(r, 0.12),
        }
      }),
    }
  }

  if (id === 'workload_by_agent') {
    return {
      columns: [
        { key: 'agent', label: 'Agent', align: 'left', sortable: true, avatar: true },
        { key: 'assigned', label: 'Assigned tickets', align: 'left', sortable: true, sortKey: 'assignedRaw' },
        { key: 'firstResponse', label: 'First response time', align: 'left', sortable: true, sortKey: 'firstResponseRaw' },
        { key: 'resolution', label: 'Total resolution time', align: 'left', sortable: true, sortKey: 'resolutionRaw' },
        { key: 'closed', label: 'Closed tickets', align: 'left', sortable: true, sortKey: 'closedRaw' },
        { key: 'messages', label: 'Messages sent', align: 'left', sortable: true, sortKey: 'messagesRaw' },
        { key: 'comments', label: 'Internal comments', align: 'left', sortable: true, sortKey: 'commentsRaw' },
      ],
      rows: AGENTS.map((agent) => ({
        agent,
        ...num('assigned', Math.max(0, 45 * scale * jitter(rng, 0.4)), fmtCount),
        ...num('firstResponse', Math.max(15, 95 * jitter(rng, 0.5)), fmtDuration),
        ...num('resolution', Math.max(600, 18000 * jitter(rng, 0.5)), fmtDuration),
        ...num('closed', Math.max(0, 55 * scale * jitter(rng, 0.4)), fmtCount),
        ...num('messages', Math.max(0, 220 * scale * jitter(rng, 0.45)), fmtCount),
        ...num('comments', Math.max(0, 60 * scale * jitter(rng, 0.5)), fmtCount),
      })),
    }
  }

  // performance_by_channel
  return {
    columns: [
      { key: 'channel', label: 'Channel', align: 'left', sortable: true },
      { key: 'resolution', label: 'Resolution time', align: 'left', sortable: true, sortKey: 'resolutionRaw' },
      { key: 'firstResponse', label: 'First response time', align: 'left', sortable: true, sortKey: 'firstResponseRaw' },
      {
        key: 'sla',
        label: 'SLA compliance',
        align: 'left',
        sortable: true,
        sortKey: 'slaRaw',
        // Worst first: with compliance on the table, the useful question is which
        // channel is breaking its promise — a work queue, not a lookup table.
        defaultSort: 'asc',
        requires: 'sla',
        hint: 'Share of this channel\u2019s tickets that met every target in its policy \u2014 miss one and the whole ticket counts as a breach. Channels without a policy aren\u2019t measured.',
      },
      { key: 'closed', label: 'Closed tickets', align: 'left', sortable: true, sortKey: 'closedRaw' },
      { key: 'open', label: 'Open tickets', align: 'left', sortable: true, sortKey: 'openRaw' },
    ],
    rows: PERF_CHANNELS.map((channel) => ({
      channel,
      ...num('resolution', Math.max(600, 18000 * jitter(rng, 0.6)), fmtDuration),
      ...num('firstResponse', Math.max(15, 95 * jitter(rng, 0.5)), fmtDuration),
      ...channelCompliance(channel, rng),
      ...num('closed', Math.max(0, 300 * scale * jitter(rng, 0.5)), fmtCount),
      ...num('open', Math.max(0, 120 * scale * jitter(rng, 0.5)), fmtCount),
    })),
  }
}

/**
 * Per-channel SLA compliance. The channel picks the policy (one channel → one policy),
 * so this is the break-down that's native to how SLA actually works.
 *
 * A channel with NO policy has no figure at all — not 0%, not 100%. It's excluded from
 * the denominator entirely (`sla-definitions-and-how.md`, Theme 3), so showing it a
 * number would invent a verdict on a promise that was never made.
 *
 * Centred on the same 0.85 the headline card uses, so the two read as consistent. ⚠️ In
 * real data they must actually reconcile (the headline is met ÷ measured across all
 * channels, not the average of these) — a weighting the mock doesn't attempt.
 */
const CHANNELS_WITHOUT_POLICY = ['Instagram']

function channelCompliance(channel: string, rng: () => number) {
  if (CHANNELS_WITHOUT_POLICY.includes(channel)) {
    // 101 keeps it out of the way when ranking worst-first — it isn't a bad score,
    // it's the absence of one, so it must never lead the queue.
    return { sla: 'No policy', slaRaw: 101 }
  }
  const pct = Math.min(0.99, Math.max(0.55, 0.85 * jitter(rng, 0.12)))
  return { sla: fmtPercent(pct), slaRaw: Math.round(pct * 100) }
}
