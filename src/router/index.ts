// Router.
//   /                        → first report if any, else /welcome
//   /welcome                 → empty state (new customer)
//   /d/:dashboardId/:reportId   → one report of one dashboard (looked up in the workspace)
//   /d/:reportId                → old shape; redirects into its dashboard
// Dashboards and reports exist at runtime, so these routes are dynamic.
// Hash history so the single-file build also works from file://.
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import DashboardView from '@/views/DashboardView.vue'
import Welcome from '@/views/Welcome.vue'
import { useWorkspace } from '@/composables/useWorkspace'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => {
      const { dashboards, dashboardPath } = useWorkspace()
      return dashboards.value.length ? dashboardPath(dashboards.value[0].id) : '/welcome'
    },
  },
  { path: '/welcome', name: 'welcome', component: Welcome },
  { path: '/d/:dashboardId/:reportId', name: 'report', component: DashboardView },
  // Links saved before dashboards existed still resolve.
  {
    path: '/d/:reportId',
    // Best effort only: a bare report id can't say which dashboard it means (see
    // dashboardOf), so an old link resolves to the first dashboard that has one.
    redirect: (to) => {
      const { dashboardOf, reportPath } = useWorkspace()
      const id = String(to.params.reportId)
      const d = dashboardOf(id)
      return d ? reportPath(d.id, id) : '/welcome'
    },
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
