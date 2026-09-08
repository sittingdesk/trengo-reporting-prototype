<script setup lang="ts">
// DashboardHeader — the title row: which dashboard you're looking at, and who owns it.
//
// Filters used to live here. They moved into ReportBar, which puts them on one row with
// the report pills (Figma 7050:9312) — so this component is now identity and nothing
// else, and the header has no background of its own: it sits on the page, not in a bar.
//
// The name is the page's h1 and is renamed in place. The element stays an h1 (it IS the
// page title, and there's no h1/h2 above it to nest under); "H3" is the type style.
import { computed } from 'vue'
import InlineEditName from '@/components/dashboard/InlineEditName.vue'
import { useWorkspace } from '@/composables/useWorkspace'
import { TEAMS } from '@/data/filters'
import type { Dashboard } from '@/data/dashboards'

const props = defineProps<{ dashboard: Dashboard }>()

const { renameDashboard } = useWorkspace()

/** Who owns this and who can see it — one quiet line under the name. */
const ownerLine = computed(() => {
  const d = props.dashboard
  if (d.readonly) return `${d.owner} · Default dashboard`
  const team = d.teamId ? TEAMS.find((t) => t.id === d.teamId)?.label : undefined
  const where = d.visibility === 'team' ? `Shared with ${team ?? 'a team'}` : 'Private'
  return `${d.owner} · ${where}`
})
</script>

<template>
  <header class="min-w-0 px-8 pt-6">
    <h1 class="min-w-0">
      <InlineEditName
        :name="dashboard.name"
        :editable="!dashboard.readonly"
        label="Dashboard name"
        @rename="renameDashboard(dashboard.id, $event)"
      />
    </h1>
    <p class="mt-0.5 truncate text-xs font-medium text-grey-600">{{ ownerLine }}</p>
  </header>
</template>
