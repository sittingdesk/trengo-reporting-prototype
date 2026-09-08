<script setup lang="ts">
// TabRow — the dashboard's reports, shown as tabs under its header.
//
// Follows the tab pattern already used elsewhere in Trengo: quiet grey labels, the
// active one darker and bolder with a leaf underline. Deliberately no count badges —
// those earn their place when a report holds countable items (contacts, notes), but a
// widget count tells the user nothing.
//
// No full-width hairline: it was the last piece of chrome dividing the top of the page
// from the widgets, and with it gone the name, reports and grid read as one page. The active
// underline is enough of a marker on its own — it marks the report, not a boundary.
//
// Read-only in this step. Add / rename / remove arrive in steps 11–13.
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useWorkspace } from '@/composables/useWorkspace'
import type { Dashboard } from '@/data/dashboards'

const props = defineProps<{ dashboard: Dashboard; activeReportId: string }>()

const { reports, reportPath } = useWorkspace()

// Reuse the store's iteration filtering rather than re-deriving it: `reports` is already
// every visible report, flat, so intersecting keeps one rule in one place.
const visibleReports = computed(() => {
  const allowed = new Set(reports.value.map((t) => t.id))
  return props.dashboard.reports.filter((t) => allowed.has(t.id))
})
</script>

<template>
  <nav
    v-if="visibleReports.length"
    class="flex items-center gap-6 overflow-x-auto px-8 scroll-thin"
    aria-label="Dashboard tabs"
  >
    <RouterLink
      v-for="t in visibleReports"
      :key="t.id"
      :to="reportPath(t.id)"
      class="relative shrink-0 py-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="
        t.id === activeReportId
          ? 'font-semibold text-grey-900'
          : 'font-medium text-grey-600 hover:text-grey-900'
      "
      :aria-current="t.id === activeReportId ? 'page' : undefined"
    >
      {{ t.name }}
      <!-- Marks the report, nothing more — there's no rule for it to sit on now. -->
      <span
        v-if="t.id === activeReportId"
        class="absolute inset-x-0 bottom-0 h-0.5 rounded-t-sm bg-leaf-500"
        aria-hidden="true"
      />
    </RouterLink>
  </nav>
</template>
