// How a time chart groups its points: per hour, per day or per week.
//
// Team Lens Daily, 2026-11-12 (LEN-229 question 7): the user picks the grouping with a
// toggle on the chart. It never switches on its own with the date range — the current
// reporting's "clever" switch (daily, hourly for a single day) was called confusing. So the
// toggle starts on Daily, and an option only goes unavailable when the range makes it
// unreadable or meaningless, with the reason on hover.
//
// Data side (André is checking BigQuery / the Reporting API): one response carrying hourly,
// daily and weekly buckets, so switching is a redraw and not a new request. Totals are the
// same in every grouping — the prototype derives hours and weeks from the same days.
//
// Open, not decided here:
// - Hours are in the WORKSPACE's timezone, not UTC — a Dutch team's 09:00 peak must not
//   read 08:00. The buckets have to be built in that timezone.
// - Weeks start on Monday (the current reporting's weekday chart runs Monday → Sunday).
// - Monthly is in the LEN-229 question ("hour, week or month") but not in the meeting's
//   decision (hourly / daily / weekly). Left out until someone confirms.

export type TimeGrain = 'hour' | 'day' | 'week'

export const TIME_GRAINS: { id: TimeGrain; label: string }[] = [
  { id: 'hour', label: 'Hourly' },
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
]

export const DEFAULT_TIME_GRAIN: TimeGrain = 'day'

/** Where the toggle goes when the range rules out the current choice: Daily, or — for a
 *  single day, where Daily is one point — Hourly. The same thing every time for the same
 *  range, so it's a rule the user can learn, not a guess. */
export function fallbackTimeGrain(days: number): TimeGrain {
  return timeGrainUnavailable(DEFAULT_TIME_GRAIN, days) ? 'hour' : DEFAULT_TIME_GRAIN
}

/** Hourly up to a week: 168 points still read as a line, a month's 744 don't. */
export const HOURLY_MAX_DAYS = 7
/** Weekly from two weeks: below that it's one or two points, not a trend. */
export const WEEKLY_MIN_DAYS = 14

/** Why a grouping can't be picked for this range — the hover text on the disabled option. */
export function timeGrainUnavailable(grain: TimeGrain, days: number): string | undefined {
  // One day is one daily point, and a line through one point draws nothing.
  if (grain === 'day' && days < 2) return 'Daily needs at least 2 days. A single day shows by the hour.'
  if (grain === 'hour' && days > HOURLY_MAX_DAYS)
    return `Hourly is available for up to ${HOURLY_MAX_DAYS} days. Pick a shorter date range.`
  if (grain === 'week' && days < WEEKLY_MIN_DAYS) return 'Weekly needs at least 2 weeks. Pick a longer date range.'
  return undefined
}
