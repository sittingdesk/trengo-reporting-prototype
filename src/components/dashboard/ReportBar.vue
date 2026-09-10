<script setup lang="ts">
// ReportBar — the dashboard's reports, as pills.
//
// The filters used to share this row (Figma 7050:9312) and it didn't survive contact with
// real numbers: they take 432px and never yield, so twelve reports showed five pills at
// 1440, one clipped mid-word, and the ACTIVE report's pill could be off-screen entirely.
// They now live on the dashboard's title row — where the scope belongs, since reports
// inherit it — which hands this row its full width and takes nine of twelve at 1440.
//
// What's left here is one mechanism: show the pills that fit, collapse the rest behind
// "+N", pin "+" at the end. "+N" states how many more exist where a fade only says
// "something"; the list holds exactly that many, so the count is a promise. No horizontal
// scroll — a mouse wheel has no horizontal axis, and a clipped pill reads as breakage
// rather than as "more this way".
//
// The report you're on is ALWAYS shown, promoted into the last visible slot if it would
// otherwise fall into the overflow. Its position moving is a smaller price than it
// vanishing.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import InlineEditName from '@/components/dashboard/InlineEditName.vue'
import Icon from '@/components/Icon.vue'
import { Tooltip } from '@/components/ui/tooltip'
import { useWorkspace } from '@/composables/useWorkspace'
import type { Dashboard, Report } from '@/data/dashboards'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const props = withDefaults(
  defineProps<{
    dashboard: Dashboard
    activeReportId: string
    /** Edit mode: each pill gains a remove button, on the same rule as the widgets —
     *  structural change lives in edit mode. */
    editing?: boolean
  }>(),
  { editing: false },
)

const router = useRouter()
const { reportPath, addReport, renameReport, removeReport } = useWorkspace()

/** Which report should open its name editor — set the moment one is created. */
const autoEditId = ref('')

async function add() {
  const report = addReport(props.dashboard.id)
  if (!report) return
  await router.push(reportPath(props.dashboard.id, report.id))
  autoEditId.value = report.id
  // One-shot. Left set, the flag re-opens the editor on every re-render — so Escape and
  // blur could never dismiss it. Once the editor is open it owns its own state.
  await nextTick()
  autoEditId.value = ''
}

// ---------------------------------------------------------------------------------------
// Measurement. The project's first width-driven control, so the rules are worth stating:
//
// Only the strip is observed, and only its width matters: hiding pills inside it can't
// change it, so there's no feedback loop to design around. (When the filters shared this
// row there was — the collapse had to be driven by the bar, because deciding it from the
// strip meant collapse → strip grows → uncollapse.)
const stripEl = ref<HTMLElement | null>(null)
const mirrorEl = ref<HTMLElement | null>(null)
const stripW = ref(0)

/** Natural rendered width of every pill, measured off a hidden mirror row. Cached, and
 *  re-measured only when the names change — pill widths depend on their text. */
const natural = ref<number[]>([])
function measure() {
  const el = mirrorEl.value
  if (!el) return
  natural.value = [...el.children].map((c) => (c as HTMLElement).offsetWidth)
}

let ro: ResizeObserver | undefined
onMounted(() => {
  ro = new ResizeObserver(([e]) => (stripW.value = e.contentRect.width))
  if (stripEl.value) ro.observe(stripEl.value)
  measure()
})
onBeforeUnmount(() => ro?.disconnect())

watch(
  () => props.dashboard.reports.map((r) => r.name).join('\u0000'),
  () => nextTick(measure),
)

// Widths the fitting maths reserves. All of them are the segmented control's own
// geometry, so they live next to each other rather than being re-derived:
const GAP = 2 // between segments, inside the track — the DS component's own 2px inset
const TRACK_PAD = 4 // the track's 2px padding, both sides
const OUTER_GAP = 8 // between the track and the "+" that sits outside it
const ADD_W = 32 // the pinned "+"
const MORE_W = 42 // the "+N" segment: 24px of padding either side of a two-glyph label

/** What a segment grows by while editing. The × sits INSIDE it, over its trailing edge,
 *  so the cost is the extra right padding (pr-7, 28px) less the 12px (px-3) the segment
 *  already had. The mirror row measures segments WITHOUT it, so the arithmetic adds it
 *  rather than the measurement — one measured value, adjusted, instead of two to keep in
 *  step. */
const REMOVE_W = 16

/** Can this report be removed? Not the last one — see `removeReport`. */
const removable = computed(() => props.editing && props.dashboard.reports.length > 1)

/**
 * Ask before removing a report that holds anything. An empty report is a name and
 * nothing else — a confirm there is a nag, and nags are what teach people to click
 * through the dialog that mattered. A report with widgets takes its whole configuration
 * with it and there is no undo, so that one asks.
 */
const pendingRemoval = ref<Report | null>(null)

const removalCopy = computed(() => {
  const r = pendingRemoval.value
  if (!r) return null
  const n = r.widgets.length
  return {
    title: `Remove \u201c${r.name}\u201d?`,
    // Whole clause per branch, not a pluralised noun dropped into one sentence: the verb
    // has to agree too, and "Its 1 widget go with it" is what that shortcut produces.
    description:
      (n === 1 ? 'Its 1 widget goes with it.' : `Its ${n} widgets go with it.`) +
      ' This can\u2019t be undone.',
  }
})

function askRemove(report: Report) {
  if (report.widgets.length === 0) {
    remove(report.id)
    return
  }
  pendingRemoval.value = report
}

function confirmRemoval() {
  const r = pendingRemoval.value
  pendingRemoval.value = null
  if (r) remove(r.id)
}

/**
 * Remove a report. If it's the one you're on, NAVIGATE AWAY FIRST, then delete — order
 * matters. Deleting first makes the active route id stop resolving, and DashboardView's
 * guard sees that within the same tick and replaces the route with '/', which lands you
 * on a different dashboard entirely. Moving off it first leaves the guard nothing to
 * catch. Neighbour is the previous report, or the next if it was already first.
 */
async function remove(reportId: string) {
  const reports = props.dashboard.reports
  const i = reports.findIndex((r) => r.id === reportId)
  const neighbour = reports[i - 1] ?? reports[i + 1]
  if (reportId === props.activeReportId && neighbour) {
    await router.push(reportPath(props.dashboard.id, neighbour.id))
  }
  removeReport(props.dashboard.id, reportId)
}

/** Greedily take pills while they fit in `budget`; returns their indices. */
function fitIn(budget: number) {
  const w = natural.value
  const extra = removable.value ? REMOVE_W : 0
  let used = 0
  const out: number[] = []
  for (let i = 0; i < w.length; i++) {
    const cost = w[i] + extra + (out.length ? GAP : 0)
    if (used + cost > budget) break
    used += cost
    out.push(i)
  }
  return out
}

/**
 * Which pills to show, and which fall into the overflow. Greedy: take pills while they
 * fit, reserving the pinned "+" and — only if anything actually overflows — the "+N"
 * trigger. Then guarantee the active report a slot, dropping visible pills from the end
 * until it fits. Document order is preserved throughout: the active index is always past
 * the ones kept, so appending it last keeps the row ascending.
 */
const split = computed(() => {
  const reports = props.dashboard.reports
  const w = natural.value
  const all = reports.map((_, i) => i)
  // Before the first measurement, or if the cache is stale, show everything — a full row
  // that reflows once is better than an empty one.
  if (!stripW.value || w.length !== reports.length) return { shown: all, hidden: [] as number[] }

  // The "+" sits OUTSIDE the track, so it costs the outer gap; the track's padding is
  // spent whatever fits inside it.
  const reserve = TRACK_PAD + (props.dashboard.readonly ? 0 : ADD_W + OUTER_GAP)

  let shown = fitIn(stripW.value - reserve)
  if (shown.length === reports.length) return { shown, hidden: [] }

  // Something overflows, so the "+N" trigger needs room too.
  const budget = stripW.value - reserve - MORE_W - GAP
  const pass = fitIn(budget)
  shown = pass.length ? pass : [0]

  const activeIdx = reports.findIndex((r) => r.id === props.activeReportId)
  if (activeIdx >= 0 && !shown.includes(activeIdx)) {
    let used = w[activeIdx]
    const keep: number[] = []
    for (const i of shown) {
      const cost = w[i] + GAP
      if (used + cost > budget) break
      used += cost
      keep.push(i)
    }
    shown = [...keep, activeIdx]
  }

  return { shown, hidden: all.filter((i) => !shown.includes(i)) }
})

const shownReports = computed(() => split.value.shown.map((i) => props.dashboard.reports[i]))
const hiddenReports = computed(() => split.value.hidden.map((i) => props.dashboard.reports[i]))

const moreOpen = ref(false)
async function goTo(reportId: string) {
  moreOpen.value = false
  await router.push(reportPath(props.dashboard.id, reportId))
}


// One unselected segment. Shares its box exactly with the selected one (InlineEditName's
// `pill` variant) — same height, padding, radius, weight and 1px transparent border — so
// selecting a report can't move the row by a pixel.
//
// Ground: nothing — an unselected segment is a hole in the track. Hover fills it with
// grey-300, one step DARKER than the grey-200 track, which is the same rule every other
// hover in the app follows (design.md §10: transparent → grey-200 on a white ground).
// It first lifted towards white instead, to preview what selecting does; darker is the
// better read, because hovering is not a preview of selection — the white-and-lifted
// treatment stays unique to the one segment that IS selected.
//
// Text is grey-700 where the DS component specifies grey-600. grey-600 on the grey-200
// track measures 4.27:1, under the 4.5:1 AA floor for 14px semibold (which is not large
// text); grey-700 is 7.3:1. Same call as the delta text and the "+" glyph before it.
const SEGMENT =
  'inline-flex h-8 max-w-[14rem] shrink-0 items-center gap-1 truncate rounded-pill border border-transparent px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const UNSELECTED = 'text-grey-700 hover:bg-grey-300 hover:text-grey-900'
</script>

<template>
  <!-- One component owns each vertical gap: the header owns 24px above the title,
       this owns 12px above the pills, and WidgetGrid's py-6 owns 24px below them. It
       contributes NOTHING below on purpose — its old py-2 was adding to the grid's py-6
       for a 32px gap that isn't on design.md's scale and that neither component chose. -->
  <div class="flex items-center px-8 pb-0 pt-3">
    <!-- `-m-1 p-1` pads the clip box out by 4px on every side and takes the space back
         with negative margin, so the row still measures 34px. Without it `overflow-hidden`
         sat flush against pills that are exactly the nav's height, and a focus ring — 2px,
         outside the border box — was clipped on all four sides. The cost is that an
         overflowing pill shows 4px before it clips, which is not worth noticing. -->
    <nav
      ref="stripEl"
      class="-m-1 flex min-w-0 flex-1 items-center gap-2 overflow-hidden p-1"
      aria-label="Reports"
    >
      <!-- The TRACK. This is what stops the reports reading as another row of filters:
           the chips beside the title are raised ON the page (white, hairline, shadow),
           while these are inset IN a groove, and only the selected one lifts out of it.
           Same tokens either way — the difference is figure and ground.
           NOT clipped: a segment's focus ring and the rename input's 4px leaf ring both
           paint past the track's 2px inset, and `overflow-hidden` here would shave them.
           Nothing needs clipping anyway, since the radii agree.
           `shadow-inner` is doing real work. The DS component's grey-200 track assumes a
           WHITE page; ours is grey-100, against which grey-200 measures 1.04:1 — the
           groove was invisible and the row read as loose text beside one white pill. The
           hairline defines it while keeping the DS fill, which is exactly what design.md
           gives shadow-inner to ("coloured surfaces"), and what §5's closing rule asks of
           any surface. A grey-300 fill was the other candidate: visible, but heavy enough
           to compete with the widget cards under it. -->
      <div class="flex shrink-0 items-center gap-0.5 rounded-pill bg-grey-200 p-0.5 shadow-inner">
      <!-- The × sits INSIDE the pill — positioned over its trailing edge, but as a
           SIBLING of the link rather than a child of it. Nesting a button inside the
           navigation link would be invalid markup and a coin-toss click target; a sibling
           on top takes the clicks that land on it and leaves the rest of the pill
           navigating, which also keeps the link a real link (middle-click still works).
           The pill reserves the room via `reserveTrailing`, so the label can't run under
           it. -->
      <span v-for="r in shownReports" :key="r.id" class="relative inline-flex shrink-0 items-center">
        <!-- The active one is a rename target, not a link to where you already are. -->
        <InlineEditName
          v-if="r.id === activeReportId"
          variant="pill"
          :name="r.name"
          :editable="!dashboard.readonly"
          :auto-edit="r.id === autoEditId"
          :reserve-trailing="removable"
          label="Report name"
          @rename="renameReport(dashboard.id, r.id, $event)"
        />
        <RouterLink
          v-else
          :to="reportPath(dashboard.id, r.id)"
          :class="[SEGMENT, UNSELECTED, removable ? 'pr-7' : '']"
        >
          {{ r.name }}
        </RouterLink>
        <!-- No border or fill of its own: inside a 32px segment a bordered mini-button
             reads as a second chip. Just the glyph, with a hover ground so the target is
             legible on both grounds it can sit on — white when the segment is selected,
             the grey track when it isn't. -->
        <button
          v-if="removable"
          type="button"
          class="absolute right-1 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-grey-600 transition-colors hover:bg-grey-300 hover:text-error-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :aria-label="`Remove ${r.name}`"
          @click="askRemove(r)"
        >
          <Icon name="Cross" :size="14" />
        </button>
      </span>

      <!-- The reports that didn't fit. The count is exactly what the list contains, so
           "+3" is a promise rather than a hint. -->
      <Popover v-if="hiddenReports.length" v-model:open="moreOpen">
        <PopoverTrigger as-child>
          <button
            type="button"
            :aria-label="`Show ${hiddenReports.length} more ${hiddenReports.length === 1 ? 'report' : 'reports'}`"
            :class="[
              SEGMENT,
              UNSELECTED,
              'data-[state=open]:bg-white data-[state=open]:text-grey-800 data-[state=open]:shadow-100',
            ]"
          >
            +{{ hiddenReports.length }}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" class="w-56 p-1.5">
          <button
            v-for="r in hiddenReports"
            :key="r.id"
            type="button"
            class="flex w-full items-center rounded-base px-2 py-1.5 text-left text-sm text-grey-900 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
            @click="goTo(r.id)"
          >
            <span class="truncate">{{ r.name }}</span>
          </button>
        </PopoverContent>
      </Popover>

      </div>

      <!-- Add a report. OUTSIDE the track, and deliberately: everything inside it is a
           report you can select, and a "+" segment would read as one more of those
           rather than as the thing that makes them. Pinned outside the overflow set too,
           so it never scrolls or collapses away — adding shouldn't require first finding
           the end of the list. Hidden on Trengo, which can't gain one. -->
      <Tooltip v-if="!dashboard.readonly" text="Add report">
        <button
          type="button"
          aria-label="Add report"
          class="inline-flex size-8 shrink-0 items-center justify-center rounded-pill bg-grey-200 text-grey-700 transition-colors hover:bg-grey-300 hover:text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @click="add()"
        >
          <!-- Round and grey-200: it belongs to the tab family (same ground as the
               track) without pretending to be a segment, and a circle beside a pill
               track reads as an action rather than an option. It was a grey-400 chip
               with a hairline and a shadow, which is the field surface — the same
               resemblance to the filters this whole change is undoing.
               20px glyph, not 24: a 24px plus in a 32px box is nearly edge to edge and
               read heavier than any tab beside it. 20 is on design.md §8's scale. -->
          <Icon name="Plus" :size="20" />
        </button>
      </Tooltip>
    </nav>

    <!-- Hidden mirror row: every pill at its natural width, so `split` can decide what
         fits without measuring the real ones (which would change as it hides them).
         Same box and same max-width as the real pills, or the numbers would lie. -->
    <div
      ref="mirrorEl"
      class="pointer-events-none absolute -left-[9999px] top-0 flex items-center gap-0.5"
      aria-hidden="true"
    >
      <span
        v-for="r in dashboard.reports"
        :key="r.id"
        class="inline-flex h-8 max-w-[14rem] shrink-0 items-center truncate whitespace-nowrap rounded-pill border border-transparent px-3 text-sm font-semibold"
      >{{ r.name }}</span>
    </div>

    <ConfirmDialog
      v-if="removalCopy"
      :open="!!pendingRemoval"
      :title="removalCopy.title"
      :description="removalCopy.description"
      confirm-label="Remove report"
      @update:open="(o: boolean) => { if (!o) pendingRemoval = null }"
      @confirm="confirmRemoval()"
    />
  </div>
</template>
