// Seeded mock-data generator for metric cards.
//
// ⚠️ Mock only: produces believable numbers that shift with the global filters
// (date range + channel + team) but are DETERMINISTIC for a given filter combo —
// so values don't flicker on re-render. Nothing here touches real data.
import { getLocalTimeZone, type DateValue } from '@internationalized/date'
import type { MetricDef } from '@/data/metrics'
import { CHANNELS, TEAMS } from '@/data/filters'

export interface MetricSample {
  value: number
  previous: number // comparable previous-period value (for the delta toggle)
  series?: number[] // hourly buckets for histograms — "Today" (length 24)
  average?: number[] // average per hour across the period (length 24)
  labels?: string[] // hour labels "00:00".."23:00"
}

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

/** A stable string identifying the current filter combination. */
export function filterSignature(
  dateRange: { start?: DateValue; end?: DateValue },
  channelIds: string[],
  teamIds: string[],
): string {
  const days = rangeDays(dateRange.start, dateRange.end)
  const ch = [...channelIds].sort().join(',') || 'all'
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
export function metricValue(def: MetricDef, signature: string): MetricSample {
  const seed = hashString(`${def.id}|${signature}`)
  const rng = mulberry32(seed)
  const [daysStr, ch, tm] = signature.split('|')
  const days = Number(daysStr) || 7

  const chFactor = subsetFactor(ch === 'all' ? 0 : ch.split(',').length, CHANNELS.length)
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
