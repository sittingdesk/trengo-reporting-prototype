<script setup lang="ts">
// DashboardView — the route view for `/d/:dashboardId/:reportId`.
//
// Composes the dashboard: header (identity) → report bar (report pills + filters) → the
// active report's widgets. Resolves both route params and owns every route concern; the header, tab row
// and grid are all pure components.
//
// No container and no sticky positioning: all three sit directly on the page background
// and scroll with the widgets, so the dashboard reads as one page rather than as chrome
// wrapped around content.
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
  <div v-if="dashboard && report" class="flex min-h-full flex-col">
    <!-- The mode's actions live in this row, in the slot the filters vacate — same
         height, same place, so entering edit mode moves nothing. There is no separate
         edit bar: a band has to push something down to exist. -->
    <DashboardHeader :dashboard="dashboard" @add="openWidgetLibrary(dashboard.id, report.id)" />
    <ReportBar :dashboard="dashboard" :active-report-id="report.id" :editing="editing" />
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
