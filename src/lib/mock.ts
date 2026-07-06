// Seeded mock-data generator for metric cards.
//
// ⚠️ Mock only: produces believable numbers that shift with the global filters
// (date range + channel + team) but are DETERMINISTIC for a given filter combo —
// so values don't flicker on re-render. Nothing here touches real data.
import { getLocalTimeZone, startOfMonth, type DateValue } from '@internationalized/date'
import type { MetricDef } from '@/data/metrics'
import { TEAMS } from '@/data/filters'
import { CHANNEL_INSTANCE_IDS } from '@/data/channelData'
import { fmtCount, fmtDuration } from '@/lib/format'

export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'right'
  badge?: boolean // render cells as a muted pill (e.g. "In development")
}
export interface TableData {
  columns: TableColumn[]
  rows: Record<string, string | number>[]
  initialRows?: number // collapsed row count; the rest reveal via "Load more"
}

export interface MetricSample {
  value: number
  previous: number // comparable previous-period value (for the delta toggle)
  series?: number[] // hourly buckets for histograms — "Today" (length 24)
  average?: number[] // average per hour across the period (length 24)
  labels?: string[] // x-axis labels (hours for histogram, dates for time series)
  lines?: { name: string; tint: 'leaf' | 'sky'; data: number[] }[] // time series
  table?: TableData
}

/** Mock agent roster for the "Workload by agent" table. */
const AGENTS = ['Sanne Bakker', 'Daan Visser', 'Emma de Jong', 'Lucas Smit', 'Julia Mulder', 'Noah Peters']

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

/**
 * Deterministic mock sample for a metric under the current filters.
 * Rates (percentage) are not scaled by range/subset; counts/durations are.
 */
export function metricValue(
  def: MetricDef,
  signature: string,
  dateRange?: { start?: DateValue; end?: DateValue },
): MetricSample {
  const seed = hashString(`${def.id}|${signature}`)
  const rng = mulberry32(seed)
  const [daysStr, ch, tm] = signature.split('|')
  const days = Number(daysStr) || 7

  const chFactor = subsetFactor(ch === 'all' ? 0 : ch.split(',').length, CHANNEL_INSTANCE_IDS.length)
  const tmFactor = subsetFactor(tm === 'all' ? 0 : tm.split(',').length, TEAMS.length)
  const base = def.base ?? 0

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
    const total = created.reduce((a, b) => a + b, 0)
    return {
      value: total,
      previous: total * jitter(rng, 0.2),
      labels,
      lines: [
        { name: 'Created', tint: 'leaf', data: created },
        { name: 'Closed', tint: 'sky', data: closed },
      ],
    }
  }

  // Tables: per-agent / per-channel rows (pre-formatted, filter-scaled).
  if (def.resultType === 'table') {
    return { value: 0, previous: 0, table: tableData(def.id, rng, chFactor, tmFactor, days) }
  }

  // Percentages / rates: bounded, not scaled by volume.
  if (def.unit === 'percentage') {
    const value = Math.min(0.99, Math.max(0.4, base * jitter(rng, 0.06)))
    const previous = Math.min(0.99, Math.max(0.4, base * jitter(rng, 0.06)))
    return { value, previous }
  }

  // Durations (stored in seconds): vary, but don't scale with range length.
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

  if (id === 'workload_by_agent') {
    return {
      columns: [
        { key: 'agent', label: 'Agent', align: 'left' },
        { key: 'assigned', label: 'Assigned tickets', align: 'left' },
        { key: 'firstResponse', label: 'First response time', align: 'left' },
        { key: 'resolution', label: 'Total resolution time', align: 'left' },
        { key: 'closed', label: 'Closed tickets', align: 'left' },
        { key: 'messages', label: 'Messages sent', align: 'left' },
        { key: 'comments', label: 'Internal comments', align: 'left' },
      ],
      rows: AGENTS.map((agent) => ({
        agent,
        assigned: fmtCount(Math.max(0, 45 * scale * jitter(rng, 0.4))),
        firstResponse: fmtDuration(Math.max(15, 95 * jitter(rng, 0.5))),
        resolution: fmtDuration(Math.max(600, 18000 * jitter(rng, 0.5))),
        closed: fmtCount(Math.max(0, 55 * scale * jitter(rng, 0.4))),
        messages: fmtCount(Math.max(0, 220 * scale * jitter(rng, 0.45))),
        comments: fmtCount(Math.max(0, 60 * scale * jitter(rng, 0.5))),
      })),
      initialRows: 4,
    }
  }

  // performance_by_channel
  return {
    columns: [
      { key: 'channel', label: 'Channel', align: 'left' },
      { key: 'resolution', label: 'Resolution time', align: 'left' },
      { key: 'firstResponse', label: 'First response time', align: 'left' },
      { key: 'sla', label: 'SLA compliance', align: 'left', badge: true },
      { key: 'closed', label: 'Closed tickets', align: 'left' },
      { key: 'open', label: 'Open tickets', align: 'left' },
    ],
    rows: PERF_CHANNELS.map((channel) => ({
      channel,
      resolution: fmtDuration(Math.max(600, 18000 * jitter(rng, 0.6))),
      firstResponse: fmtDuration(Math.max(15, 95 * jitter(rng, 0.5))),
      sla: 'In development', // not a real metric yet
      closed: fmtCount(Math.max(0, 300 * scale * jitter(rng, 0.5))),
      open: fmtCount(Math.max(0, 120 * scale * jitter(rng, 0.5))),
    })),
    initialRows: 4,
  }
}
