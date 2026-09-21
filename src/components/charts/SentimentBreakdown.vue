<script setup lang="ts">
// SentimentBreakdown — survey responses split into positive / neutral / negative.
//
// Plain divs, no Chart.js. `FunnelChart` set this precedent for the same reason: at three
// rows of flat colour a canvas, its animation loop and a tooltip plugin are pure overhead,
// and divs let the bars take design tokens directly instead of reading them back out of
// `getComputedStyle`.
//
// ⚠️ The contract is EXACTLY three buckets in the order positive, neutral, negative. This
// is not a general stat-group component — the tone and the icon per row come from the
// row's POSITION, which is only safe because the order is fixed. A fourth bucket, or the
// same three in another order, would render wrong rather than fail.
//
// Why three rows rather than the reference's 2×2 grid of counts: three bare numbers make
// you do the arithmetic before they mean anything (30 / 1 / 2 — out of what?), and the
// grid leaves the bottom half of a 274px card empty. Every competitor checked leads with
// the share instead — Freshdesk, Gorgias and Zoho all headline "% positive", Help Scout
// shows percentages with the count on hover. So: share is the number, count supports it,
// and the bar carries the proportion that a number on its own cannot.
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import { fmtCount } from '@/lib/format'

const props = withDefaults(
  defineProps<{
    /** Bucket names, in order: positive, neutral, negative. */
    labels: string[]
    /** Response count per bucket, same order. */
    data: number[]
    height?: number
  }>(),
  { height: 200 },
)

/**
 * Tone by position, using the scale the whole app already runs on.
 *
 * `delta.ts`'s `toneClassFor` colours every KPI delta on the site good / neither / bad as
 * leaf-600 / grey-600 / error-600, and that is exactly the three-way judgement this card
 * makes. The reference design shows an amber neutral; there is no amber to use — the
 * semantic block in `index.css` is three reds and nothing else, and `design.md` assigns
 * `sun` exactly one meaning ("note card background"). Inventing a token would breach
 * CLAUDE.md rule 5, and grey is the honest colour for "neither good nor bad" anyway.
 *
 * Text takes the 600 stops (AA at 4.5:1 for text); the bar fills take the lighter 500/400
 * stops (a graphic needs 3:1, not 4.5). That split is the one this project already made
 * when the delta text moved leaf-500 → leaf-600 while its arrow stayed at 500.
 */
const TONES = [
  { icon: 'EmotionHappy', text: 'text-leaf-600', fill: 'bg-leaf-500' },
  { icon: 'EmotionNeutral', text: 'text-grey-600', fill: 'bg-grey-400' },
  { icon: 'EmotionSad', text: 'text-error-600', fill: 'bg-error-500' },
] as const

const total = computed(() => props.data.reduce((a, b) => a + b, 0))

/**
 * Whole-number shares that actually sum to 100.
 *
 * Rounding each bucket on its own is what `fmtPercent` does, and on a card whose entire
 * claim is "these are the parts of one whole" it prints 86% + 7% + 8% = 101%. Individually
 * each of those is the correct rounding; together they contradict the card. So this uses
 * the largest-remainder method — floor everything, then hand the leftover points to the
 * buckets with the biggest fractions. The cost is that one bucket can read one point off
 * its own exact share; the counts beside it are exact and settle any argument.
 *
 * This is the one place in the app that doesn't route a percentage through `fmtPercent`,
 * and the reason is the summing constraint, which no other percentage here has.
 */
function sharesTo100(values: number[], sum: number): number[] {
  if (sum <= 0) return values.map(() => 0)
  const exact = values.map((v) => (v / sum) * 100)
  const out = exact.map(Math.floor)
  let left = 100 - out.reduce((a, b) => a + b, 0)
  const byFraction = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  for (let k = 0; k < byFraction.length && left > 0; k++, left--) out[byFraction[k].i]++
  return out
}

const rows = computed(() => {
  const pcts = sharesTo100(props.data, total.value)
  return props.labels.map((label, i) => {
    const value = props.data[i] ?? 0
    return {
      label,
      value,
      share: `${pcts[i]}%`,
      // The bar is the SHARE, not the count scaled to the largest bucket. An 86% row has to
      // look like most of the track, or the bar tells a different story from the number
      // above it. It uses the SAME rounded percentage that is printed, so the two can never
      // disagree. A non-zero bucket keeps a 1.5% hairline so it is never invisible; zero,
      // and only zero, renders nothing.
      width: value > 0 ? `${Math.max(1.5, pcts[i])}%` : '0%',
      // "1 response", not "1 responses". Pluralising the noun and leaving the verb behind
      // is the bug this project has already fixed twice ("Its 1 widget go with it").
      support: `${fmtCount(value)} ${value === 1 ? 'response' : 'responses'}`,
      ...TONES[Math.min(i, TONES.length - 1)],
    }
  })
})
</script>

<template>
  <!-- 20px between rows and 8px inside one, both off design.md §3.2's gap scale
       (3 / 4 / 8 / 10 / 12 / 20). They were 24 and 6, which are on no scale at all. -->
  <div class="flex flex-col justify-center gap-5" :style="{ height: `${height}px` }">
    <div v-for="row in rows" :key="row.label" class="flex flex-col gap-2">
      <!-- Everything textual on one line: name left, then the count and the share right.
           The count sits INSIDE this line rather than beside the bar, because a supporting
           figure next to the track makes each track a different width — "103 responses" is
           wider than "8 responses" — and three bars on three different baselines can't be
           compared, which is the only reason to draw them. -->
      <div class="flex items-baseline justify-between gap-2">
        <!-- 20px: the middle stop, and the only one both of design.md's two icon-size
             lists agree on (the summary table says 16/20/24, §8.1 says 16/20/32). At 16 the
             faces read as punctuation; at 24 they outweighed the label. -->
        <!-- 14/600/20 — design.md §2.2's emphasised style, the only regular/emphasised pair
             the scale actually names (14/500 body → 14/600). It was 12/500, the tooltip and
             badge tier, which read as a caption under the number rather than as the thing
             naming the row. Costs no height: the line is set by the 18px share's 24px
             leading, not by this. -->
        <span class="flex items-center gap-2 truncate text-sm font-semibold leading-5 text-grey-700">
          <Icon :name="row.icon" :size="20" class="shrink-0" :class="row.text" />
          {{ row.label }}
        </span>
        <span class="flex shrink-0 items-baseline gap-2">
          <span class="text-xs font-medium leading-4 tabular-nums text-grey-600">{{ row.support }}</span>
          <!-- 18px/700/24 — `text-lg`, the top of design.md §2's scale before the H3
               token. It was 24, which is the H3 heading size: a heading's worth of weight
               for a number that sits three tiers below the card title, and at that size the
               red row read heavier than its neighbours even though all three render
               identically. One step down keeps the share clearly the number you read while
               it stops shouting. -->
          <span class="text-lg font-bold leading-6 tabular-nums" :class="row.text">{{ row.share }}</span>
        </span>
      </div>
      <!-- One full-width track per row, all identical, so the three fills are comparable
           against each other and not merely against themselves. -->
      <div class="h-1.5 overflow-hidden rounded-pill bg-grey-200">
        <div
          class="h-full rounded-pill transition-[width] duration-200"
          :class="row.fill"
          :style="{ width: row.width }"
        />
      </div>
    </div>
  </div>
</template>
