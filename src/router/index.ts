// Router.
//   /                        → first tab if any, else /welcome
//   /welcome                 → empty state (new customer)
//   /d/:dashboardId/:tabId   → one tab of one dashboard (looked up in the workspace)
//   /d/:tabId                → old shape; redirects into its dashboard
// Dashboards and tabs exist at runtime, so these routes are dynamic.
// Hash history so the single-file build also works from file://.
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import DashboardTab from '@/views/DashboardTab.vue'
import Welcome from '@/views/Welcome.vue'
import { useWorkspace } from '@/composables/useWorkspace'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => {
      const { tabs, tabPath } = useWorkspace()
      return tabs.value.length ? tabPath(tabs.value[0].id) : '/welcome'
    },
  },
  { path: '/welcome', name: 'welcome', component: Welcome },
  { path: '/d/:dashboardId/:tabId', name: 'tab', component: DashboardTab },
  // Links saved before dashboards existed still resolve.
  {
    path: '/d/:tabId',
    redirect: (to) => useWorkspace().tabPath(String(to.params.tabId)),
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
