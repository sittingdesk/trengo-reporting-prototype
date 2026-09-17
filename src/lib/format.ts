// Number formatting helpers for metric cards — keyed off a metric's `unit`.
import type { Unit } from '@/data/metrics'

const intFmt = new Intl.NumberFormat('en-GB')

// Currency formatting, built per currency and cached.
//
// The locale has to travel WITH the currency, not stay fixed: `Intl.NumberFormat('en-IE',
// { currency: 'USD' })` renders "US$1,240", which reads as a bug. Each currency gets the
// locale that writes it the way its readers expect.
const CURRENCY_LOCALE: Record<string, string> = { EUR: 'en-IE', USD: 'en-US', GBP: 'en-GB' }
const currencyFmts = new Map<string, Intl.NumberFormat>()
function currencyFmt(currency: string): Intl.NumberFormat {
  let fmt = currencyFmts.get(currency)
  if (!fmt) {
    fmt = new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? 'en-IE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    })
    currencyFmts.set(currency, fmt)
  }
  return fmt
}

/** The bare symbol, for the compact path — "€", "$". Asked of Intl rather than written
 *  down, so a new currency needs no second edit. */
function currencySymbol(currency: string): string {
  const part = currencyFmt(currency)
    .formatToParts(0)
    .find((p) => p.type === 'currency')
  return part?.value ?? currency
}

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

/** Whole days → "18 days" / "1 day". Kept out of fmtDuration, which caps at hours
 *  (an 18-day sales cycle would otherwise render as "432h"). */
export function fmtDays(days: number): string {
  const d = Math.max(0, Math.round(days))
  return `${d} ${d === 1 ? 'day' : 'days'}`
}

/** A 0–1 ratio → "92%". */
export function fmtPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

/**
 * Compact money — "€1,240" / "€18k" / "$310k".
 *
 * Defaults to EUR so every existing call site is unchanged. The currency is a real
 * argument because amounts here come from a BOARD, and two boards can be denominated
 * differently — see src/data/boards.ts.
 *
 * The compact path used to hard-code a "€" glyph, which meant `pipeline_value` (248,000)
 * rendered "€248k" from a string literal and never reached Intl at all: the card asserted
 * a single-currency workspace, asserted it was EUR, and — by showing one number across
 * every board — asserted that deals in different currencies add up. None of the three was
 * ever true.
 */
export function fmtCurrency(amount: number, currency = 'EUR'): string {
  if (amount >= 10000) return `${currencySymbol(currency)}${Math.round(amount / 1000)}k`
  return currencyFmt(currency).format(Math.round(amount))
}

/** Format a raw value according to its unit. `currency` applies only to money. */
export function formatValue(value: number, unit: Unit, currency?: string): string {
  switch (unit) {
    case 'percentage':
      return fmtPercent(value)
    case 'seconds':
    case 'minutes':
    case 'hours':
      return fmtDuration(value) // value metrics store duration in seconds
    case 'days':
      return fmtDays(value) // stored in days, not seconds (e.g. sales cycle)
    case 'currency':
      return fmtCurrency(value, currency)
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
