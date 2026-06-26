// Number formatting helpers for metric cards — keyed off a metric's `unit`.
import type { Unit } from '@/data/metrics'

const intFmt = new Intl.NumberFormat('en-GB')
const eurFmt = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export function fmtCount(n: number): string {
  return intFmt.format(Math.round(n))
}

/** Seconds → "45s" / "1m 30s" / "2h 5m". */
export function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  if (m > 0) return sec > 0 ? `${m}m ${sec}s` : `${m}m`
  return `${sec}s`
}

/** A 0–1 ratio → "92%". */
export function fmtPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

/** Compact EUR — "€1,240" / "€18k". */
export function fmtCurrency(amount: number): string {
  if (amount >= 10000) return `€${Math.round(amount / 1000)}k`
  return eurFmt.format(Math.round(amount))
}

/** Format a raw value according to its unit. */
export function formatValue(value: number, unit: Unit): string {
  switch (unit) {
    case 'percentage':
      return fmtPercent(value)
    case 'seconds':
    case 'minutes':
    case 'hours':
    case 'days':
      return fmtDuration(value) // value metrics store duration in seconds
    case 'currency':
      return fmtCurrency(value)
    case 'count':
    default:
      return fmtCount(value)
  }
}

/** Signed percentage change current vs previous, e.g. "+7%" / "-3%". */
export function fmtDelta(current: number, previous: number): string {
  if (!previous) return '0%'
  const pct = Math.round(((current - previous) / previous) * 100)
  return `${pct > 0 ? '+' : ''}${pct}%`
}
