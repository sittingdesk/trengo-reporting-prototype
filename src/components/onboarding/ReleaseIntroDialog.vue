<script setup lang="ts">
// ReleaseIntroDialog — the heads-up a beta user sees once they're added to the beta.
//
// It appears in the CURRENT reporting, where beta users already are, and offers one
// choice: "Try the new Analytics" takes them in; "Not now" closes it and leaves them
// exactly where they were. It is shown ONCE — a second showing would treat a clear
// "not now" as a misunderstanding — and the way back in is a "New" badge on the Analytics
// entry in the navigation until their first visit (not built in the prototype).
//
// No feedback ask here: they haven't used it yet. Feedback lives in Analytics itself (the
// "Beta · Share feedback" pill in the dashboard header); the note only says where.
//
// In the prototype it opens only from the sidebar's Prototype panel (Release modal →
// Show), and since there is no old-reporting screen to stay on, "Try" lands on the first
// report and "Not now" simply closes.
//
// Copy lives in src/data/releaseIntro.ts.
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/Icon.vue'
import { RELEASE_INTRO as COPY } from '@/data/releaseIntro'
import { useSettings } from '@/composables/useSettings'
import { useWorkspace } from '@/composables/useWorkspace'

const { releaseIntroOpen, closeReleaseIntro } = useSettings()
const { dashboards, dashboardPath } = useWorkspace()
const router = useRouter()

/** Into Analytics, at the start: the first dashboard's first report. */
function tryAnalytics() {
  closeReleaseIntro()
  const first = dashboards.value[0]
  if (first) router.push(dashboardPath(first.id))
}

// Full class strings so Tailwind's JIT keeps them. The 200/800 pairs the agent avatars
// use, not the 100/600 ones in NewDashboardDialog: sky-100 (#f4fcff) and purple-100
// (#fbf4ff) are all but white, and two of the three squares disappeared against the card.
const TINT_CLASS = {
  leaf: 'bg-leaf-200 text-leaf-800',
  sky: 'bg-sky-200 text-sky-800',
  purple: 'bg-purple-200 text-purple-800',
} as const

/**
 * Confetti — a single burst from the bottom centre of the modal, behind all content. Each
 * piece flies straight to its own landing point, decelerates and comes to rest anywhere from
 * the footer to just under the top edge — and sideways PAST the modal's edges, so the burst
 * reads as bigger than the box it's in — then settles a few px and fades. Fixed, not random, so every opening looks the same and
 * the prototype is reviewable.
 *
 * Travel is a share of the MODAL, not pixels (container units — the layer is a size
 * container, see the style block), so the burst scales with any modal width: up to 68% of
 * its width to either side (the edge is at 50%, so about a quarter of the pieces fly out of
 * it) and 12–90% of its height up. A piece past the edge is MASKED, not drawn on the
 * overlay: the layer and DialogContent both clip (overflow-hidden), so it disappears at the
 * modal's border — inside the rounded corners too.
 */
const CONFETTI_COLORS = ['leaf-300', 'sky-500', 'sun-500', 'purple-500', 'peach-500'] as const
const CONFETTI = Array.from({ length: 48 }, (_, i) => {
  // Landing points spread evenly over the whole modal (an R2 low-discrepancy sequence), not
  // fanned from the origin: a fan bunches up the middle and never reaches the corners.
  const u = (0.5 + i * 0.7548777) % 1 // 0–1 across
  const v = (0.5 + i * 0.5698403) % 1 // 0–1 up
  return {
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: i % 3 === 0,
    delay: (i * 23) % 140, // all within ~0.15s: one burst, not a trickle
    duration: 1500 + ((i * 131) % 600),
    dx: +((u * 2 - 1) * 68).toFixed(1), // % of modal width (cqw); beyond ±50 = clipped at the edge
    dy: +(-(12 + v * 78)).toFixed(1), // % of modal height (cqh); negative = up
    rot: 120 + ((i * 97) % 300),
  }
})

const primaryBtn = ref<InstanceType<typeof Button> | null>(null)
// Land on the primary action rather than the close button — the default would put a
// keyboard user's first Enter on "dismiss".
function focusPrimary(e: Event) {
  e.preventDefault()
  ;(primaryBtn.value?.$el as HTMLElement | undefined)?.focus()
}

function onOpenChange(open: boolean) {
  if (!open) closeReleaseIntro()
}
</script>

<template>
  <Dialog :open="releaseIntroOpen" @update:open="onOpenChange">
    <!-- The close button sits on the header's centre line: header = 16 + 24 (title line)
         + 16 = 56px, so a 32px button at top-3 (12px) is centred on y 28 with the title. -->
    <DialogContent
      class="max-w-lg gap-0 overflow-hidden p-0"
      close-class="top-3"
      @open-auto-focus="focusPrimary"
    >
      <!-- Confetti: the illustration was removed (Jeff, 2026-10-13), the burst stays and now
           spans the whole modal. Its own layer at inset-0, `-z-10` inside DialogContent's
           stacking context (fixed + z-50): it paints above the dialog's white ground but
           BEHIND every piece of content, so it never covers a word or a button. One-off,
           chart-palette colours, pieces fly past the side edges and are clipped there
           (overflow-hidden here and on DialogContent), so nothing ever lands on the overlay.
           Decorative, and skipped under prefers-reduced-motion. -->
      <div class="release-confetti-layer pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <span
          v-for="(c, i) in CONFETTI"
          :key="i"
          class="release-confetti absolute bottom-0 left-1/2"
          :class="c.round ? 'size-2 rounded-circle' : 'h-1.5 w-3 rounded-xs'"
          :style="{
            backgroundColor: `var(--color-${c.color})`,
            animationDelay: `${c.delay}ms`,
            animationDuration: `${c.duration}ms`,
            '--dx': `${c.dx}cqw`,
            '--dy': `${c.dy}cqh`,
            '--rot': `${c.rot}deg`,
          }"
        />
      </div>

      <!-- Header: title and Beta badge on one line, the close button level with them, and a
           hairline edge to edge beneath — the same grey-200 rule the footer sits on. -->
      <div class="flex items-center gap-2 border-b border-grey-200 py-4 pl-6 pr-14">
        <DialogTitle class="text-lg font-bold">{{ COPY.title }}</DialogTitle>
        <Badge variant="muted" class="text-grey-700">{{ COPY.badge }}</Badge>
      </div>

      <div class="flex flex-col gap-5 px-6 pb-6 pt-6">
        <DialogDescription class="text-sm text-grey-600">{{ COPY.lead }}</DialogDescription>

        <ul class="flex flex-col gap-5">
          <li v-for="row in COPY.rows" :key="row.title" class="flex items-start gap-3">
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-base"
              :class="TINT_CLASS[row.tint]"
              aria-hidden="true"
            >
              <Icon :name="row.icon" :size="16" />
            </span>
            <span class="flex min-w-0 flex-col">
              <span class="text-sm font-semibold text-grey-900">{{ row.title }}</span>
              <span class="text-xs font-medium text-grey-600">{{ row.body }}</span>
            </span>
          </li>
        </ul>

        <!-- The reassurance, set apart on its own surface so it can't be skimmed past as a
             fourth feature. It carries two jobs: nothing is being taken away, and a number
             that differs from the old report is expected, not a bug.
             Inline-banner styling: grey-100 fill with a 1px grey-300 hairline all round —
             the border cards and this modal use. design.md has no banner spec; its nearest
             (expanded Used resources) is the same grey fill + 1px border + 12px padding. -->
        <div class="flex gap-3 rounded-lg border border-grey-300 bg-grey-100 p-3">
          <Icon name="Info" :size="16" class="mt-0.5 shrink-0 text-grey-600" />
          <p class="text-sm font-medium text-grey-700">{{ COPY.note }}</p>
        </div>
      </div>

      <!-- The modal's one choice: in now, or later. "Not now" is quiet (ghost) and sits
           left of the primary, so the eye and a keyboard's first Enter both land on Try. -->
      <div class="flex items-center justify-end gap-2 border-t border-grey-200 px-6 py-4">
        <Button variant="ghost" @click="closeReleaseIntro">{{ COPY.secondary }}</Button>
        <Button ref="primaryBtn" @click="tryAnalytics">{{ COPY.primary }}</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
/* The confetti layer is a size container, so each piece's travel (cqw / cqh) is measured
   against the layer itself and always lands inside it. */
.release-confetti-layer {
  container-type: size;
}

/* Confetti burst: out from the bottom centre along each piece's own vector (--dx, --dy),
   fast at first and easing to a stop — the deceleration is what reads as an explosion
   rather than rain — then a small settle under "gravity" and a fade, so nothing is left on
   screen. `both` keeps each piece hidden until its delay is up. */
.release-confetti {
  opacity: 0;
  animation-name: release-confetti-burst;
  animation-timing-function: linear;
  animation-fill-mode: both;
  animation-iteration-count: 1;
}
@keyframes release-confetti-burst {
  0% {
    transform: translate3d(-50%, 0, 0) rotate(0deg) scale(0.4);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.1, 0.8, 0.25, 1);
  }
  8% { opacity: 1; }
  55% {
    transform: translate3d(calc(-50% + var(--dx)), var(--dy), 0) rotate(var(--rot)) scale(1);
    opacity: 1;
    animation-timing-function: ease-in;
  }
  100% {
    transform: translate3d(calc(-50% + var(--dx)), calc(var(--dy) + 6cqh), 0)
      rotate(calc(var(--rot) + 60deg)) scale(1);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .release-confetti { display: none; }
}
</style>
