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
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from '@/composables/useWorkspace'
import { useFilters } from '@/composables/useFilters'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import ReportBar from '@/components/dashboard/ReportBar.vue'
import WidgetGrid from '@/components/dashboard/WidgetGrid.vue'

const route = useRoute()
const router = useRouter()
const { getDashboard, editing, setEditing, removeWidget } = useWorkspace()
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

// Apply the saved scope on open. Any temporary filter change is discarded when you
// switch dashboards — deliberate, and the "Filters changed" marker (step 9) is what
// warns you the working view has diverged before you leave it.
watch(
  () => dashboard.value?.id,
  (id) => {
    if (id && dashboard.value) applyScope(dashboard.value.scope)
    // Edit mode belongs to the dashboard you entered it on, so switching leaves it.
    setEditing(false)
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="dashboard && report" class="flex min-h-full flex-col">
    <DashboardHeader :dashboard="dashboard" />
    <ReportBar :dashboard="dashboard" :active-report-id="report.id" />
    <WidgetGrid
      :widgets="report.widgets"
      :report-name="report.name"
      :editing="editing"
      :can-edit="!dashboard.readonly"
      @remove="removeWidget(dashboard.id, report.id, $event)"
      @edit="setEditing(true, dashboard.id)"
    />
  </div>
</template>
