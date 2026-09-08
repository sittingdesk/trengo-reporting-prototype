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
import type { Dashboard } from '@/data/dashboards'

const props = defineProps<{ dashboard: Dashboard; activeReportId: string }>()

const router = useRouter()
const { reportPath, addReport, renameReport } = useWorkspace()

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

const GAP = 8
const ADD_W = 34 // the pinned "+"
const MORE_W = 40 // the "+N" trigger

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


// Inactive pill: filled grey, no border in the design — but it carries a TRANSPARENT one
// so it stands exactly as tall as the active pill, which does have one.
const INACTIVE_PILL =
  'inline-block max-w-[14rem] shrink-0 truncate rounded-base border border-transparent bg-grey-200 px-2 py-1.5 text-sm font-medium text-grey-700 transition-colors hover:bg-grey-300 hover:text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
</script>

<template>
  <div class="flex items-center px-8 py-2">
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

  </div>
</template>
