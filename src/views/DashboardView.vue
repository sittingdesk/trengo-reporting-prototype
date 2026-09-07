<script setup lang="ts">
// DashboardView — the route view for `/d/:dashboardId/:tabId`.
//
// Composes the dashboard: header (identity + filters) → [tab row, step 6] → the active
// tab's widgets. Resolves both route params and owns every route concern; the header and
// the grid are both pure components.
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from '@/composables/useWorkspace'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import WidgetGrid from '@/components/dashboard/WidgetGrid.vue'

const route = useRoute()
const router = useRouter()
const { getDashboard, getTab } = useWorkspace()

const dashboard = computed(() => getDashboard(String(route.params.dashboardId)))
const tab = computed(() => getTab(String(route.params.tabId)))

// If either id doesn't resolve (e.g. after a scenario reseed), bounce home.
watch(
  [dashboard, tab],
  ([d, t]) => {
    if (!d || !t) router.replace('/')
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="dashboard && tab" class="flex min-h-full flex-col">
    <DashboardHeader :dashboard="dashboard" />
    <WidgetGrid :widgets="tab.widgets" :tab-name="tab.name" />
  </div>
</template>
