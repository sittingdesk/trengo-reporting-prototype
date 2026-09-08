<script setup lang="ts">
// DashboardView — the route view for `/d/:dashboardId/:reportId`.
//
// Composes the dashboard: header (identity + filters) → tab row → the active report's
// widgets. Resolves both route params and owns every route concern; the header, tab row
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
import TabRow from '@/components/dashboard/TabRow.vue'
import WidgetGrid from '@/components/dashboard/WidgetGrid.vue'

const route = useRoute()
const router = useRouter()
const { getDashboard, getReport } = useWorkspace()
const { applyScope } = useFilters()

const dashboard = computed(() => getDashboard(String(route.params.dashboardId)))
const report = computed(() => getReport(String(route.params.reportId)))

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
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="dashboard && report" class="flex min-h-full flex-col">
    <DashboardHeader :dashboard="dashboard" />
    <TabRow :dashboard="dashboard" :active-report-id="report.id" />
    <WidgetGrid :widgets="report.widgets" :report-name="report.name" />
  </div>
</template>
