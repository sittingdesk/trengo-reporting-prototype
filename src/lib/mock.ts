// Seeded mock-data generator for metric cards.
//
// ⚠️ Mock only: produces believable numbers that shift with the global filters
// (date range + channel + team) but are DETERMINISTIC for a given filter combo —
// so values don't flicker on re-render. Nothing here touches real data.
import { getLocalTimeZone, startOfMonth, type DateValue } from '@internationalized/date'
import type { MetricDef, FeatureFlag } from '@/data/metrics'
import { TEAMS } from '@/data/filters'
import { CHANNEL_INSTANCE_IDS, CATALOG } from '@/data/channelData'
import { fmtCount, fmtDuration, fmtPercent } from '@/lib/format'

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
  lines?: { name: string; tint: 'leaf' | 'sky'; data: number[]; dashed?: boolean; csvKey?: string }[]
  table?: TableData
  heatmap?: number[][] // 7 rows (Mon–Sun) × 24 hour columns (voip_calls_by_day_hour)
  funnel?: { stage: string; count: number }[] // funnel stages (deal_stage_funnel)
  donut?: { label: string; value: number }[] // doughnut segments (new_vs_returning)
  legendBelow?: boolean // render the line-chart legend below the chart (not header)
  /** Dashed reference line on a time chart (e.g. the period average). */
  referenceValue?: number
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

export function metricValue(
  def: MetricDef,
  signature: string,
  dateRange?: { start?: DateValue; end?: DateValue },
  dimensionId?: string,
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

  // Average wait time, broken down by DATE. Same measure as the per-team view — only
  // the group-by differs (that's the whole point of dimensions). Durations don't scale
  // with the range length, so buckets only jitter around the base.
  if (def.id === 'wait_time' && dimensionId === 'time') {
    const bucketed = timeSeriesBuckets(dateRange?.start, dateRange?.end)
    const labels = bucketed.labels.length ? bucketed.labels : ['—']
    const tsRng = mulberry32(hashString(`${def.id}|time|${signature}`))
    // Queue wait only (VoIP1+2) vs the team view's 5-component total wait — the registry
    // sizes that gap at ~35%, so show it rather than pretending the views agree.
    const data = labels.map(() =>
      Math.max(5, Math.round(base * 0.65 * tmFactor * jitter(tsRng, 0.45))),
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
          { name: 'New contacts', tint: 'sky', data: newc, dashed: true, csvKey: 'new_contacts' },
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
          { name: 'Outbound', tint: 'sky', data: outbound },
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
            { name: 'Closed', tint: 'sky' as const, data: closed },
          ]
        : [{ name: 'Tickets', tint: 'leaf' as const, data: created }]
    return { value: total, previous: total * jitter(rng, 0.2), labels, lines }
  }

  // Breakdown bars: one bar per channel category (WhatsApp / Live chat / Email / Voice).
  if (def.resultType === 'breakdown') {
    // Avg queue wait (seconds) per team — durations don't scale by subset (the
    // per-signature seed varies them by filter); team filter narrows which teams show.
    if (def.id === 'wait_time') {
      const teams = tm === 'all' ? TEAMS : TEAMS.filter((t) => tm.split(',').includes(t.id))
      const rows = teams
        .map((t) => ({ label: t.label, value: Math.max(5, Math.round(base * jitter(rng, 0.5))) }))
        .sort((a, b) => b.value - a.value) // longest wait first — the operational signal
      return {
        value: rows.reduce((a, r) => a + r.value, 0),
        previous: 0,
        labels: rows.map((r) => r.label),
        series: rows.map((r) => r.value),
      }
    }
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

  // Tables: per-agent / per-channel rows (pre-formatted, filter-scaled).
  if (def.resultType === 'table') {
    return { value: 0, previous: 0, table: tableData(def.id, rng, chFactor, tmFactor, days) }
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
    const totalCalls = 90 * Math.sqrt(days / 7) * chFactor * tmFactor // matches calls_volume
    const inbound = Math.max(1, Math.round(totalCalls * 0.32)) // inbound share, per call_volume
    const missed = Math.max(0, Math.round(inbound * base * jitter(rng, 0.3)))
    const prevMissed = Math.max(0, Math.round(inbound * base * jitter(rng, 0.3)))
    return {
      value: missed / inbound,
      previous: prevMissed / inbound,
      secondary: `${fmtCount(missed)} of ${fmtCount(inbound)} inbound`,
    }
  }

  // Percentages / rates: bounded, not scaled by volume.
  if (def.unit === 'percentage') {
    const value = Math.min(0.99, Math.max(0.4, base * jitter(rng, 0.06)))
    const previous = Math.min(0.99, Math.max(0.4, base * jitter(rng, 0.06)))
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
