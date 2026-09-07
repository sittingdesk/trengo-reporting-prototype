<script setup lang="ts">
// DashboardView — the route view for `/d/:dashboardId/:tabId`.
//
// Composes the dashboard: header (identity + filters) → tab row → the active tab's
// widgets. Resolves both route params and owns every route concern; the header, tab row
// and grid are all pure components.
//
// Header + tab row are pinned as ONE block: filters that scroll away are unreachable
// exactly when you're looking at the widgets they govern, and a tab row that scrolls
// while the header stays would separate two halves of the same chrome.
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
    <div class="sticky top-0 z-10 bg-white">
      <DashboardHeader :dashboard="dashboard" />
      <TabRow :dashboard="dashboard" :active-tab-id="tab.id" />
    </div>
    <WidgetGrid :widgets="tab.widgets" :tab-name="tab.name" />
  </div>
</template>
