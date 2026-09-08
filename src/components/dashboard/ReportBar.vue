<script setup lang="ts">
// ReportBar — the dashboard's reports and its filters, on one row.
//
// Figma node 7050:9312. Reports are PILLS now, not underlined tabs, and they share the
// row with the filters instead of sitting above them in a separate bordered card. The
// bar has no background of its own: the design's fill is grey-100, which is the page, so
// what's left is a row with vertical padding — chrome that isn't there.
//
// Pills left, filters right — and neither scrolls. With 12 reports the strip needed
// 1209px against the filters' fixed 432px, so at a 1440 screen four pills showed, one was
// clipped mid-word, and the ACTIVE report's pill could be off-screen entirely: navigation
// that doesn't say where you are.
//
// Instead: show the pills that fit, collapse the rest behind "+N", and pin "+" at the end.
// "+N" states how many more exist, where a fade or an arrow only says "something"; one
// click reaches any of them; and it works with a mouse, whose wheel has no horizontal axis.
// The report you're on is ALWAYS shown, promoted into the last visible slot if it would
// otherwise fall into the overflow — its position moving is a smaller price than it
// vanishing.
//
// When the bar is narrow the FILTERS collapse to icon-only, not the pills: reports are
// navigation, filters are refinement, so refinement gives way. The date chip keeps its
// label either way — it never shows an active state, so its label is the only signal of
// which period you're looking at.
//
// The active report's pill doubles as its rename control (same "click to rename" as the
// dashboard title). Creating a report opens that editor straight away — a new report
// called "New report" is useless, so naming it is part of making it, not a second trip.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import DateRangeFilter from '@/components/layout/filters/DateRangeFilter.vue'
import ChannelFilter from '@/components/layout/filters/ChannelFilter.vue'
import SelectFilter from '@/components/layout/filters/SelectFilter.vue'
import InlineEditName from '@/components/dashboard/InlineEditName.vue'
import Icon from '@/components/Icon.vue'
import { Tooltip } from '@/components/ui/tooltip'
import { useFilters } from '@/composables/useFilters'
import { useWorkspace } from '@/composables/useWorkspace'
import { TEAMS } from '@/data/filters'
import type { Dashboard } from '@/data/dashboards'

const props = defineProps<{ dashboard: Dashboard; activeReportId: string }>()

const router = useRouter()
const { teamIds, toggleTeam, clearTeams, applyScope, currentScope, isCustomRange, isDirty } =
  useFilters()
const { reportPath, addReport, renameReport, saveScope } = useWorkspace()

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
// Two elements are observed, and which one drives what matters. The pill strip is
// `flex-1`, so its width is decided by the FILTERS — hiding pills inside it doesn't change
// it, which makes it safe to drive the pill split from. The filter collapse is driven by
// the BAR instead: deciding it from the strip would be a feedback loop (collapse → strip
// grows → uncollapse → strip shrinks).
const barEl = ref<HTMLElement | null>(null)
const stripEl = ref<HTMLElement | null>(null)
const filtersEl = ref<HTMLElement | null>(null)
const mirrorEl = ref<HTMLElement | null>(null)
const barW = ref(0)
const stripW = ref(0)
const filtersW = ref(0)

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
  ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      if (e.target === barEl.value) barW.value = e.contentRect.width
      if (e.target === stripEl.value) stripW.value = e.contentRect.width
      if (e.target === filtersEl.value) filtersW.value = e.contentRect.width
    }
  })
  if (barEl.value) ro.observe(barEl.value)
  if (stripEl.value) ro.observe(stripEl.value)
  if (filtersEl.value) ro.observe(filtersEl.value)
  measure()
})
onBeforeUnmount(() => ro?.disconnect())

watch(
  () => props.dashboard.reports.map((r) => r.name).join('\u0000'),
  () => nextTick(measure),
)

const GAP = 8
const ADD_W = 34 // the pinned "+"
const MORE_W = 40 // the "+N" trigger

/**
 * Three levers, applied in this order: shrink the filter labels, then wrap the filters to
 * their own row, then hide reports behind "+N". They have to be ORDERED or the behaviour
 * isn't monotonic — with the wrap driven independently by CSS, a 900px window showed FOUR
 * report pills while a 1200px window showed two, because the wider one kept the filters
 * inline and starved the strip.
 */

/** Full-width filters (~432px) need roughly this much bar before the pills are left with
 *  a workable strip. A heuristic rather than a measurement, because measuring the compact
 *  width while rendering the full one isn't possible without a second mirror. */
const COMPACT_BAR = 950
const compactFilters = computed(() => barW.value > 0 && barW.value < COMPACT_BAR)

/** What the whole row of pills, plus the pinned "+", would take at natural width. */
const pillsNeeded = computed(() => {
  const w = natural.value
  if (!w.length) return 0
  const pills = w.reduce((a, b) => a + b, 0) + GAP * (w.length - 1)
  return pills + (props.dashboard.readonly ? 0 : ADD_W + GAP)
})

/** Greedily take pills while they fit in `budget`; returns their indices. */
function fitIn(budget: number) {
  const w = natural.value
  let used = 0
  const out: number[] = []
  for (let i = 0; i < w.length; i++) {
    const cost = w[i] + (out.length ? GAP : 0)
    if (used + cost > budget) break
    used += cost
    out.push(i)
  }
  return out
}

/** How many pills a strip of this width would actually show, reserves included. */
function shownCount(strip: number) {
  const reserve = props.dashboard.readonly ? 0 : ADD_W + GAP
  const first = fitIn(strip - reserve)
  if (first.length === natural.value.length) return first.length
  return Math.max(fitIn(strip - reserve - MORE_W - GAP).length, 1)
}

/** Below three visible pills a shared row has stopped being a row of tabs — it's one tab
 *  and a menu, at which point the second line is cheaper than what it costs you. */
const MIN_SHOWN = 3

/**
 * Wrap the filters to their own line when either:
 *  - doing so reveals EVERY report. Two rows are worth the complete set; they are not
 *    worth showing ten reports instead of six, which is why this asks whether wrapping
 *    solves the problem rather than just whether things are tight. This is what keeps a
 *    normal five-report dashboard whole down to ~900px.
 *  - or the shared row is down to fewer than three pills, where staying inline trades a
 *    row of navigation for a dropdown and gains nothing.
 */
const wrapFilters = computed(() => {
  if (!barW.value || !pillsNeeded.value) return false
  const inline = barW.value - GAP - filtersW.value
  if (inline >= pillsNeeded.value) return false
  return barW.value >= pillsNeeded.value || shownCount(inline) < MIN_SHOWN
})

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

  const reserve = props.dashboard.readonly ? 0 : ADD_W + GAP

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

const dirty = computed(() => isDirty(props.dashboard.scope))

/**
 * Why saving isn't possible, or undefined when it is. In a tooltip on Save rather than as
 * standing text: the greyed button already says "not now", and a permanent sentence spent
 * its width restating that.
 */
const blockedReason = computed(() => {
  // Names the way out, since Trengo offers no duplicate action of its own.
  if (props.dashboard.readonly)
    return 'The Trengo dashboard can’t be changed. Make your own from New dashboard.'
  // A saved scope holds a preset, never two dates — an absolute range would freeze on the
  // day it was saved and quietly go stale.
  if (isCustomRange.value) return 'Pick a relative range like Last 30 days to save it.'
  return undefined
})

const reset = () => applyScope(props.dashboard.scope)
const save = () => {
  if (blockedReason.value) return
  saveScope(props.dashboard.id, currentScope())
}

// Inactive pill: filled grey, no border in the design — but it carries a TRANSPARENT one
// so it stands exactly as tall as the active pill, which does have one.
const INACTIVE_PILL =
  'inline-block max-w-[14rem] shrink-0 truncate rounded-base border border-transparent bg-grey-200 px-2 py-1.5 text-sm font-medium text-grey-700 transition-colors hover:bg-grey-300 hover:text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
</script>

<template>
  <div ref="barEl" class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-8 py-2">
    <!-- Reports. `basis-full` takes the whole row when wrapping would reveal every
         report, pushing the filters to a second line; otherwise the strip shares the row
         and the overflow menu takes the strain. See `wrapFilters`. -->
    <nav
      ref="stripEl"
      class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
      :class="wrapFilters ? 'basis-full' : ''"
      aria-label="Reports"
    >
      <template v-for="r in shownReports" :key="r.id">
        <!-- The active one is a rename target, not a link to where you already are. -->
        <InlineEditName
          v-if="r.id === activeReportId"
          variant="pill"
          :name="r.name"
          :editable="!dashboard.readonly"
          :auto-edit="r.id === autoEditId"
          label="Report name"
          @rename="renameReport(dashboard.id, r.id, $event)"
        />
        <RouterLink v-else :to="reportPath(dashboard.id, r.id)" :class="INACTIVE_PILL">
          {{ r.name }}
        </RouterLink>
      </template>

      <!-- The reports that didn't fit. The count is exactly what the list contains, so
           "+3" is a promise rather than a hint. -->
      <Popover v-if="hiddenReports.length" v-model:open="moreOpen">
        <PopoverTrigger as-child>
          <button
            type="button"
            :aria-label="`Show ${hiddenReports.length} more reports`"
            class="inline-flex shrink-0 items-center rounded-base border border-transparent bg-grey-200 px-2 py-1.5 text-sm font-medium text-grey-700 transition-colors hover:bg-grey-300 hover:text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-grey-300"
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

      <!-- Add a report. Pinned OUTSIDE the overflow set, so it never scrolls or collapses
           away — adding shouldn't require first finding the end of the list. Hidden on
           Trengo, which can't gain one. -->
      <Tooltip v-if="!dashboard.readonly" text="Add report">
        <button
          type="button"
          aria-label="Add report"
          class="inline-flex shrink-0 items-center justify-center rounded-base border border-grey-400 bg-grey-400 p-1 text-grey-800 shadow-100 transition-colors hover:border-grey-600 hover:bg-grey-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @click="add()"
        >
          <!-- The design draws this glyph near-white on grey-400 — 1.66:1, well under the
               3:1 a meaningful icon needs. Chip tone kept, glyph darkened to grey-800. -->
          <Icon name="Plus" :size="24" />
        </button>
      </Tooltip>
    </nav>

    <!-- Hidden mirror row: every pill at its natural width, so `split` can decide what
         fits without measuring the real ones (which would change as it hides them).
         Same box and same max-width as the real pills, or the numbers would lie. -->
    <div
      ref="mirrorEl"
      class="pointer-events-none absolute -left-[9999px] top-0 flex items-center gap-2"
      aria-hidden="true"
    >
      <span
        v-for="r in dashboard.reports"
        :key="r.id"
        class="inline-block max-w-[14rem] shrink-0 truncate whitespace-nowrap rounded-base border px-2 py-1.5 text-sm font-medium"
      >{{ r.name }}</span>
    </div>

    <!-- Filters. Reports inherit them; there is no per-report filtering. -->
    <div ref="filtersEl" class="flex shrink-0 flex-col items-end gap-1">
      <div class="flex items-center gap-2">
        <!-- Never compact: with no active state, this label is the only thing telling you
             which period you're looking at. -->
        <DateRangeFilter />
        <ChannelFilter :compact="compactFilters" />
        <SelectFilter
          label="Team"
          icon="Users"
          :options="TEAMS"
          :selected-ids="teamIds"
          :compact="compactFilters"
          @toggle="toggleTeam"
          @clear="clearTeams"
        />
      </div>

      <!-- Only present while the working view differs from the saved one. Sits under the
           filters it describes, rather than across the page as a banner. -->
      <div v-if="dirty" class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
        <span class="flex items-center gap-2 text-sm font-medium text-grey-800">
          <span class="size-1.5 shrink-0 rounded-circle bg-leaf-500" aria-hidden="true" />
          Filters changed
        </span>
        <button
          type="button"
          class="text-sm font-medium text-grey-700 transition-colors hover:text-grey-900 focus:outline-none focus-visible:underline"
          @click="reset()"
        >
          Reset
        </button>
        <!-- aria-disabled, not disabled: a disabled button fires no pointer events (so the
             tooltip could never open) and leaves the tab order (so a keyboard user could
             never find out why Save is off). `save()` guards itself. -->
        <Tooltip :text="blockedReason">
          <button
            type="button"
            :aria-disabled="blockedReason ? true : undefined"
            class="h-5 rounded-lg bg-grey-900 px-2 text-sm font-medium text-grey-100 transition-colors hover:bg-grey-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:cursor-not-allowed aria-disabled:bg-grey-400 aria-disabled:hover:bg-grey-400"
            @click="save()"
          >
            Save
          </button>
        </Tooltip>
      </div>
    </div>
  </div>
</template>
