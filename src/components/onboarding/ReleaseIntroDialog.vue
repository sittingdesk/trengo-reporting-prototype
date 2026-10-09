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
      <!-- Header: title and Beta badge on one line, the close button level with them, and a
           hairline edge to edge beneath — the same grey-200 rule the footer sits on. -->
      <div class="flex items-center gap-2 border-b border-grey-200 py-4 pl-6 pr-14">
        <DialogTitle class="text-lg font-bold">{{ COPY.title }}</DialogTitle>
        <Badge variant="recommended">{{ COPY.badge }}</Badge>
      </div>

      <!-- Preview band: a spotkit spot illustration (layout L7, "Fanned") — a raised chart
           card over two metric cards. Abstract on purpose: it should read as "analytics"
           without ever being mistaken for a screenshot, so it never goes stale as the
           product changes. Inlined rather than an <img> so the --il-* tokens below can
           theme it; ids carry the "-analytics" suffix so they can't collide. Decorative. -->
      <!-- Inset, not edge to edge: the same 24px as the text below, so the picture sits
           inside the modal's frame as an object rather than bleeding off as a banner. -->
      <div class="release-il mx-6 mt-6 flex h-48 justify-center rounded-lg bg-grey-100">
        <svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" class="size-48" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="fadeG-analytics" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.7" stop-color="#fff"/><stop offset="0.82" stop-color="#000"/>
            </linearGradient>
            <mask id="fade-analytics"><rect width="160" height="160" fill="url(#fadeG-analytics)"/></mask>
            <linearGradient id="panelG-analytics" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="var(--il-panel-top, #FCFBF9)"/>
              <stop offset="1" stop-color="var(--il-panel, #F7F5F2)"/>
            </linearGradient>
            <filter id="lift-analytics" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.6"
                flood-color="var(--il-shadow-c, #4A3F33)" flood-opacity="var(--il-shadow-o, 0.16)"/>
            </filter>
            <filter id="liftL-analytics" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="4" stdDeviation="5"
                flood-color="var(--il-shadow-c, #4A3F33)" flood-opacity="var(--il-shadow-o, 0.16)"/>
            </filter>
          </defs>
          <g mask="url(#fade-analytics)">
            <rect x="16" y="44" width="128" height="92" rx="10" fill="url(#panelG-analytics)" stroke="var(--il-line, #B9B1A4)" stroke-width="0.5"/>
            <rect x="22" y="54" width="46" height="50" rx="9" fill="var(--il-surface, #FFFFFF)" stroke="var(--il-line, #B9B1A4)" stroke-width="0.5"/>
            <rect x="29" y="65.8" width="16" height="4.2" rx="2.1" fill="var(--il-fill, #DCD6CE)"/>
            <rect x="29" y="75" width="22" height="8" rx="4" fill="var(--il-fill, #DCD6CE)"/>
            <rect x="29" y="88" width="12" height="4.2" rx="2.1" fill="var(--il-fill, #DCD6CE)"/>
            <rect x="92" y="54" width="46" height="50" rx="9" fill="var(--il-surface, #FFFFFF)" stroke="var(--il-line, #B9B1A4)" stroke-width="0.5"/>
            <rect x="113" y="65.8" width="16" height="4.2" rx="2.1" fill="var(--il-fill, #DCD6CE)"/>
            <rect x="109" y="75" width="22" height="8" rx="4" fill="var(--il-fill, #DCD6CE)"/>
            <rect x="117" y="88" width="12" height="4.2" rx="2.1" fill="var(--il-fill, #DCD6CE)"/>
            <rect x="48" y="112" width="64" height="5" rx="2.5" fill="var(--il-fill, #DCD6CE)"/>
            <rect x="58" y="121" width="44" height="4.4" rx="2.2" fill="var(--il-fill, #DCD6CE)"/>
          </g>
          <g filter="url(#liftL-analytics)"><rect x="55" y="32" width="50" height="60" rx="11" fill="var(--il-surface, #FFFFFF)" stroke="var(--il-line, #B9B1A4)" stroke-width="0.5"/></g>
          <rect x="62" y="40" width="20" height="4.2" rx="2.1" fill="var(--il-fill, #DCD6CE)"/>
          <rect x="62" y="67.5" width="6" height="16" rx="3" fill="var(--il-fill, #DCD6CE)"/>
          <rect x="72" y="57.5" width="6" height="26" rx="3" fill="var(--il-fill, #DCD6CE)"/>
          <rect x="82" y="63.5" width="6" height="20" rx="3" fill="var(--il-fill, #DCD6CE)"/>
          <rect x="92" y="49.5" width="6" height="34" rx="3" fill="var(--il-accent, #3E9077)"/>
          <rect x="61" y="83.5" width="38" height="0.5" fill="var(--il-line, #B9B1A4)" opacity="0.8"/>
        </svg>
      </div>

      <div class="flex flex-col gap-5 px-6 pb-6 pt-5">
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
             that differs from the old report is expected, not a bug. -->
        <div class="flex gap-3 rounded-lg bg-grey-100 p-3">
          <Icon name="Info" :size="16" class="mt-0.5 shrink-0 text-grey-600" />
          <p class="text-xs font-medium text-grey-700">
            <span class="font-semibold text-grey-900">{{ COPY.note.title }}</span>
            {{ ' ' }}{{ COPY.note.body }}{{ ' ' }}{{ COPY.note.feedback }}
          </p>
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
/* Spotkit's illustration tokens, mapped onto design.md's — the warm greys it ships with
   would clash with the app's cool ones. The band's grey-100 is the canvas the panel fades
   into; leaf is the one accent (the tallest bar). */
.release-il {
  --il-canvas: var(--color-grey-100);
  --il-ghost: var(--color-grey-200);
  --il-panel-top: var(--color-white, #fff);
  --il-panel: var(--color-grey-100);
  --il-line: var(--color-grey-400);
  --il-surface: var(--color-white, #fff);
  --il-stroke: var(--color-grey-900);
  --il-stroke-soft: var(--color-grey-600);
  --il-fill: var(--color-grey-300);
  --il-fill-soft: var(--color-grey-200);
  --il-accent: var(--color-leaf-500);
  --il-shadow-c: var(--color-grey-900);
  --il-shadow-o: 0.12;
}
</style>
