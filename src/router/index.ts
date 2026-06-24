// Router.
//   /            → first tab if any, else /welcome
//   /welcome     → empty state (new customer)
//   /d/:tabId    → a dashboard tab (content looked up in the workspace)
// Tabs are created at runtime from templates, so this route is dynamic.
// Hash history so the single-file build also works from file://.
import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import DashboardTab from '@/views/DashboardTab.vue'
import Welcome from '@/views/Welcome.vue'
import { useWorkspace } from '@/composables/useWorkspace'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => {
      const { tabs } = useWorkspace()
      return tabs.value.length ? `/d/${tabs.value[0].id}` : '/welcome'
    },
  },
  { path: '/welcome', name: 'welcome', component: Welcome },
  { path: '/d/:tabId', name: 'tab', component: DashboardTab },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
