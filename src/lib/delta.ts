// Period-over-period change — the rules, in one place.
//
// This was a computed inside MetricBox while a card was the only thing that showed a
// delta. The sales table shows one per cell now, and two implementations of "is this
// change good, and is it big enough to say so" is how a table ends up colouring a 3%
// wobble red while the card beside it calls the same move nothing.
//
// Everything here is moved, not redesigned: the same bands, the same tone names, the same
// rounding. The one addition is `Direction` as an explicit value — see below.

/** Movement smaller than this is noise, not news — below it the delta shows the change
 *  but stays neutral. Previously 0.05%, which made a 0.2% wobble render as a red alarm
 *  and left whole pages with no uncoloured card at all. 5% matches the noise floor the
 *  comparison framework uses for efficiency metrics. */
export const FLAT_BAND_PCT = 5

/** Arrows are a fact at any size; only the JUDGEMENT needs a threshold. */
const ARROW_PCT = 0.05

/**
 * Which way is good for this measure.
 *
 * Stated rather than inferred. On `MetricDef` the same thing is two optional booleans, so
 * "up is good, we decided" and "nobody has thought about this metric" are both the absence
 * of a flag — and a metric nobody considered still gets a green arrow for free. A table's
 * columns force the issue: four columns of one widget need four different answers, and
 * there is nowhere above them to put it.
 *
 * `neutral` is a finished decision: this measure is not good or bad on its own (more calls
 * can mean demand or an outage). It still shows the movement; it just refuses to judge it.
 */
export type Direction = 'up_good' | 'down_good' | 'neutral'

export interface Delta {
  /** Unsigned, one decimal place, with the % — "6.2%". The arrow carries the sign. */
  pct: string
  up: boolean
  down: boolean
  tone: 'good' | 'bad' | 'flat' | 'neutral'
}

/**
 * The change from `previous` to `current`, and what we're willing to say about it.
 *
 * `previous || 1` guards a zero denominator. Worth knowing what it does rather than
 * trusting it: with a zero previous the denominator silently becomes 1 IN THE MEASURE'S
 * OWN UNITS, so a count going 0 → 320 reads "32000.0%". Unreachable with today's mock,
 * which never emits a zero prior for anything delta-eligible, and exactly the small-sample
 * case a minimum-n rule would catch — see the comparison spec in the plan file.
 */
export function deltaOf(current: number, previous: number, direction: Direction): Delta {
  const pct = ((current - previous) / (previous || 1)) * 100
  // One ordered scale over signed change, so every value lands in exactly one band — no
  // gap where a change matches no rule. Positive = moved the good way.
  const signed = direction === 'down_good' ? -pct : pct
  const tone =
    direction === 'neutral'
      ? 'neutral'
      : signed >= FLAT_BAND_PCT
        ? 'good'
        : signed <= -FLAT_BAND_PCT
          ? 'bad'
          : 'flat'
  return { pct: `${Math.abs(pct).toFixed(1)}%`, up: pct > ARROW_PCT, down: pct < -ARROW_PCT, tone }
}

/** Text colour for a tone. The -600 stops, not the -500s: at the sizes a delta renders
 *  (12px on a card, 14px in a table cell) leaf-500 is 3.55:1 and error-500 4.13:1, both
 *  under AA's 4.5. leaf-600 is 5.14 and error-600 4.74. The arrow carries the direction
 *  regardless, so colour is never the only signal — but it is now also legible. */
export function toneClassFor(tone: Delta['tone'] | undefined): string {
  switch (tone) {
    case 'good':
      return 'text-leaf-600'
    case 'bad':
      return 'text-error-600'
    default:
      // flat (too small to matter) and neutral (not ours to judge) read the same to a
      // customer; they're distinguished in code because only one of them is a decision.
      return 'text-grey-600'
  }
}
