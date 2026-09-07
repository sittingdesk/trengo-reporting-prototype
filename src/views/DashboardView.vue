<script setup lang="ts">
// DashboardView — the route view for `/d/:dashboardId/:tabId`.
//
// Composes the dashboard: header (identity + filters) → tab row → the active tab's
// widgets. Resolves both route params and owns every route concern; the header, tab row
// and grid are all pure components.
//
// No container and no sticky positioning: all three sit directly on the page background
// and scroll with the widgets, so the dashboard reads as one page rather than as chrome
// wrapped around content.
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from '@/composables/useWorkspace'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import TabRow from '@/components/dashboard/TabRow.vue'
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
    <TabRow :dashboard="dashboard" :active-tab-id="tab.id" />
    <WidgetGrid :widgets="tab.widgets" :tab-name="tab.name" />
  </div>
</template>
