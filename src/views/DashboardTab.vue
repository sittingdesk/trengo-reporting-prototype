<script setup lang="ts">
// DashboardTab — the route view for one tab (`/d/:dashboardId/:tabId`).
//
// Looks the tab up in the workspace and hands its widgets to WidgetGrid. The grid
// itself knows nothing about routes; this is the only place that does.
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from '@/composables/useWorkspace'
import WidgetGrid from '@/components/dashboard/WidgetGrid.vue'

const route = useRoute()
const router = useRouter()
const { getTab } = useWorkspace()

const tab = computed(() => getTab(String(route.params.tabId)))

// If the tab id doesn't exist (e.g. after a scenario reseed), bounce home.
watch(
  tab,
  (t) => {
    if (!t) router.replace('/')
  },
  { immediate: true },
)
</script>

<template>
  <WidgetGrid v-if="tab" :widgets="tab.widgets" :tab-name="tab.name" />
</template>
