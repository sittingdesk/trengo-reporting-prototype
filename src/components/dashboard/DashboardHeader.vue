<script setup lang="ts">
// DashboardHeader — identifies the dashboard you're looking at and holds its filters.
//
// Replaces TopBar, which showed the *tab* name and the global filters. Both belong to
// the dashboard now: filters are a property of the dashboard (its saved scope), not of
// the tab, and tabs inherit them.
//
// The "Filters changed" marker, Reset and Save arrive in step 9 — this step is
// identification plus the filters themselves. No background of its own: it sits on the
// page, not in a bar.
import { computed } from 'vue'
import DateRangeFilter from '@/components/layout/filters/DateRangeFilter.vue'
import ChannelFilter from '@/components/layout/filters/ChannelFilter.vue'
import SelectFilter from '@/components/layout/filters/SelectFilter.vue'
import { useFilters } from '@/composables/useFilters'
import { TEAMS } from '@/data/filters'
import type { Dashboard } from '@/data/dashboards'

const props = defineProps<{ dashboard: Dashboard }>()

const { teamIds, toggleTeam, clearTeams } = useFilters()

/** Who owns this and who can see it — one quiet line under the name. */
const ownerLine = computed(() => {
  const d = props.dashboard
  if (d.visibility === 'everyone') return `${d.owner} · Default dashboard`
  const team = d.teamId ? TEAMS.find((t) => t.id === d.teamId)?.label : undefined
  const where = d.visibility === 'team' ? `Shared with ${team ?? 'a team'}` : 'Private'
  return `${d.owner} · ${where}`
})
</script>

<template>
  <header class="px-8 pb-4 pt-6">
    <div class="flex items-start justify-between gap-4">
      <!-- Identity -->
      <div class="min-w-0">
        <h1 class="truncate text-lg font-bold text-grey-900">{{ dashboard.name }}</h1>
        <p class="mt-0.5 truncate text-xs font-medium text-grey-600">{{ ownerLine }}</p>
      </div>

      <!-- The dashboard's filters. Tabs inherit them; there is no per-tab filtering. -->
      <div class="flex shrink-0 items-center gap-2">
        <DateRangeFilter />
        <ChannelFilter />
        <SelectFilter
          label="Team"
          icon="Users"
          :options="TEAMS"
          :selected-ids="teamIds"
          @toggle="toggleTeam"
          @clear="clearTeams"
        />
      </div>
    </div>
  </header>
</template>
