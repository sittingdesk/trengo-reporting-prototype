<script setup lang="ts">
// DashboardView — the route view for `/d/:dashboardId/:reportId`.
//
// Composes the dashboard: header (identity) → report bar (report pills + filters) → the
// active report's widgets. Resolves both route params and owns every route concern; the header, tab row
// and grid are all pure components.
//
// The header and the report bar are PINNED, as one block; the widgets scroll under them.
// Operate is 1.7 screens against a 900px viewport, and everything you reach for while
// reading it — the three filters, the report pills, Edit, and in edit mode Done — lives in
// those top 106px. Unpinned, the bottom of a long report has no controls at all.
//
// Twice this row was pinned and twice it came back out, both times because it read as
// chrome wrapped around the content rather than as one page. So it announces itself only
// while it is actually holding position: no container, no rule, no shadow, and at rest the
// page is pixel-identical to the unpinned one. What marks the boundary is a gradient that
// hangs BELOW the block and is invisible until something scrolls into it.
//
// Opening a dashboard applies its saved scope. Keyed on the dashboard id, not the report,
// because reports inherit the dashboard's filters — switching reports must not reset them.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from '@/composables/useWorkspace'
import { useFilters } from '@/composables/useFilters'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import ReportBar from '@/components/dashboard/ReportBar.vue'
import WidgetGrid from '@/components/dashboard/WidgetGrid.vue'

const route = useRoute()
const router = useRouter()
const {
  getDashboard,
  editing,
  setEditing,
  removeWidget,
  widgetLibrary,
  openWidgetLibrary,
  closeWidgetLibrary,
  retargetWidgetLibrary,
} = useWorkspace()
const { applyScope } = useFilters()

const dashboard = computed(() => getDashboard(String(route.params.dashboardId)))
// Resolved WITHIN the dashboard, not from a flat list: looking it up globally meant
// /d/<dashboardA>/<reportOfB> passed both checks and rendered A's tab row with nothing
// active beside B's widgets.
const report = computed(() =>
  dashboard.value?.reports.find((r) => r.id === String(route.params.reportId)),
)

// If either id doesn't resolve (e.g. after a scenario reseed), bounce home.
watch(
  [dashboard, report],
  ([d, t]) => {
    if (!d || !t) router.replace('/')
  },
  { immediate: true },
)

/**
 * Leaving the mode from the bar unmounts the button you just pressed, which drops focus to
 * <body> — so put it somewhere sensible. The grid wrapper takes it, and one polite live
 * region carries the mode change for anyone who can't see the band appear or go.
 */
const gridEl = ref<HTMLElement | null>(null)
const modeAnnouncement = ref('')
watch(editing, async (on) => {
  modeAnnouncement.value = on
    ? 'Editing dashboard. Widgets can be added or removed.'
    : 'Editing finished.'
  if (!on) {
    await nextTick()
    // preventScroll, and it matters: .focus() scrolls its target into view, so leaving
    // the mode was yanking the page down to the grid and taking the header with it. The
    // focus move itself still earns its keep for the Escape exit — Done no longer
    // unmounts itself now that it lives in the header, but Escape leaves focus nowhere.
    gridEl.value?.focus({ preventScroll: true })
  }
})

/**
 * A new report starts at the top.
 *
 * `<main>` is the app's only scroll container and nothing reset it on navigation, so
 * switching report kept the previous offset. That was invisible while the report pills
 * scrolled away with everything else — you could only switch from the top, so the offset
 * was always 0. Now that the pills are pinned you can switch from the bottom of a long
 * report, and you'd arrive halfway down the next one with its first row of cards behind the
 * chrome. Reached through the grid wrapper this view already owns rather than by querying
 * for `main`, so it can only ever find the scroller this view is inside.
 *
 * Fires on identity, so adding or removing a widget doesn't trip it — those mutate the
 * report in place.
 */
watch(report, () => {
  gridEl.value?.closest('main')?.scrollTo({ top: 0 })
})

/**
 * Escape leaves the mode — the second exit, so you're never dependent on finding a button.
 * Ordered, not simultaneous: while the widget library is open it takes the key (its own
 * handler), so one press closes the panel and the next leaves the mode. A confirm dialog
 * outranks both.
 */
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !editing.value) return
  // Two guards, because listener order between this and the panel isn't stable: the panel
  // marks the event handled when it closes, and this checks the state as well, so whichever
  // runs first, one press does one thing.
  if (e.defaultPrevented || widgetLibrary.value) return
  if (document.querySelector('[role="alertdialog"]')) return
  setEditing(false)
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// The library outlives a report switch (the mode is the dashboard's), so it has to follow
// you — otherwise the next add lands on the report you just left.
watch(
  () => report.value?.id,
  (id) => {
    if (id && widgetLibrary.value) retargetWidgetLibrary(id)
  },
)

// Apply the saved scope on open. Any temporary filter change is discarded when you
// switch dashboards — deliberate, and the "Filters changed" marker (step 9) is what
// warns you the working view has diverged before you leave it.
watch(
  () => dashboard.value?.id,
  (id) => {
    if (id && dashboard.value) applyScope(dashboard.value.scope)
    // Edit mode belongs to the dashboard you entered it on, so switching leaves it — and
    // the widget library goes with it, since its target was a report on the old one.
    setEditing(false)
    closeWidgetLibrary()
  },
  { immediate: true },
)
</script>

<template>
  <!-- The editing ground sits HERE, on the whole dashboard, not on the grid alone. It
       started under the widgets, which left a colour seam right below the report pills —
       the header and the pills stayed on the page's grey-100 while the cards sat on
       grey-200, so the mode looked like it applied to half the page. It applies to all of
       it: the name is renameable, the reports are removable, the widgets are both. One
       ground says that; two said the opposite.
       `min-h-full` is what makes it cover — the root fills `main` even when the report is
       short, so the ground reaches the bottom of the viewport rather than stopping under
       the last card. -->
  <div
    v-if="dashboard && report"
    class="flex min-h-full flex-col transition-colors"
    :class="editing ? 'bg-grey-200' : ''"
  >
    <!-- One sticky wrapper, not two sticky siblings: pinning the bar separately means it
         carries `top: 58px`, a copy of the header's height that is wrong the moment the
         "Filters changed" row appears and the header grows to 80px.
         `sticky`, never `fixed`. `<main>` is the only scroll container and it sits 312px in
         from the rail and sidebar, so a fixed row would have to re-derive that offset on
         every resize, would cover the reserved scrollbar gutter, and — out of flow — would
         need a spacer of its own height or the first card jumps under it. It would also
         break DashboardHeader's ResizeObserver, which measures the header itself to decide
         when the filters drop their labels.
         The ground is mode-aware because a transparent pinned row lets content scroll
         THROUGH it: grey-100 is the page, grey-200 is the editing ground this view paints
         below. Both are spelled out; the root can say `editing ? 'bg-grey-200' : ''` because
         `main` is behind it, but this is the lid and can never be transparent.
         `transition-colors` so the wrapper crosses modes in lockstep with the root — without
         it a 106px band changes colour 150ms before the rest of the page.
         z-10 is design.md §9.3's number for a page header (its mechanism there is a
         flex-shrink row, not this, but the number is free): the ladder in use is z-[1] for
         in-scroller stickies, z-40 the widget library, z-50 popovers and dialogs. So the
         library panel still overlays this, which is right — it overlays the page.
         ⚠️ The z-index makes this a stacking context, so anything overlay-shaped added
         inside these two rows must be portalled or it will sink under the library's z-40.
         Everything here already is (reka's Popover/Tooltip/AlertDialog portals). -->
    <div
      class="sticky top-0 z-10 transition-colors"
      :class="editing ? 'bg-grey-200' : 'bg-grey-100'"
    >
      <!-- The mode's actions live in this row, in the slot the filters vacate — same
           height, same place, so entering edit mode moves nothing. There is no separate
           edit bar: a band has to push something down to exist. -->
      <DashboardHeader :dashboard="dashboard" @add="openWidgetLibrary(dashboard.id, report.id)" />
      <ReportBar :dashboard="dashboard" :active-report-id="report.id" :editing="editing" />
      <!-- The boundary. It hangs below the block (`top-full`), over the 24px of ground the
           grid already owns above its first row — so at rest it paints ground on ground and
           is invisible BY CONSTRUCTION, with no scroll position to track and nothing to be
           wrong on first paint. Scrolled, a card dissolves into the chrome instead of being
           sliced by an invisible line.
           The same device DataTable uses to fade its last rows into the card's bottom edge
           (`bg-gradient-to-t from-white to-transparent`), pointed the other way. 16px was
           too weak to read against a 36px number; 24 is on design.md's padding scale.
           `-z-10` keeps the claim true under focus as well as at rest: ReportBar's nav hangs
           its padding box 4px below this wrapper (the `-m-1 p-1` that stops a pill's focus
           ring being clipped), and a positioned descendant would paint over that ring.
           Negative z puts the strip under the rows' content while leaving it above the
           cards, which are outside this stacking context. -->
      <div
        class="pointer-events-none absolute inset-x-0 top-full -z-10 h-6 bg-gradient-to-b to-transparent transition-colors"
        :class="editing ? 'from-grey-200' : 'from-grey-100'"
        aria-hidden="true"
      />
    </div>
    <!-- tabindex -1 so focus has somewhere to land when the mode's Done button unmounts
         itself. Never in the tab order. -->
    <div ref="gridEl" tabindex="-1" class="flex flex-1 flex-col focus:outline-none">
      <WidgetGrid
        :widgets="report.widgets"
        :report-name="report.name"
        :editing="editing"
        :can-edit="!dashboard.readonly"
        @remove="removeWidget(dashboard.id, report.id, $event)"
        @add="openWidgetLibrary(dashboard.id, report.id)"
      />
    </div>
    <p class="sr-only" role="status" aria-live="polite">{{ modeAnnouncement }}</p>
  </div>
</template>
