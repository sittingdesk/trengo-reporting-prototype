<script setup lang="ts">
// DashboardHeader — identifies the dashboard you're looking at and holds its filters.
//
// Replaces TopBar, which showed the *tab* name and the global filters. Both belong to
// the dashboard now: filters are a property of the dashboard (its saved scope), not of
// the tab, and tabs inherit them.
//
// No background of its own: it sits on the page, not in a bar.
//
// Changing a filter is TEMPORARY. The row below appears the moment the working view
// differs from what's saved, so you always know whether you're looking at the dashboard
// as its owner left it — and it's the only warning before switching away discards the
// change.
import { computed } from 'vue'
import DateRangeFilter from '@/components/layout/filters/DateRangeFilter.vue'
import ChannelFilter from '@/components/layout/filters/ChannelFilter.vue'
import SelectFilter from '@/components/layout/filters/SelectFilter.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFilters } from '@/composables/useFilters'
import { useWorkspace } from '@/composables/useWorkspace'
import { TEAMS } from '@/data/filters'
import type { Dashboard } from '@/data/dashboards'

const props = defineProps<{ dashboard: Dashboard }>()

const { teamIds, toggleTeam, clearTeams, applyScope, currentScope, isCustomRange, isDirty } =
  useFilters()
const { saveScope } = useWorkspace()

/** Who owns this and who can see it — one quiet line under the name. */
const ownerLine = computed(() => {
  const d = props.dashboard
  if (d.visibility === 'everyone') return `${d.owner} · Default dashboard`
  const team = d.teamId ? TEAMS.find((t) => t.id === d.teamId)?.label : undefined
  const where = d.visibility === 'team' ? `Shared with ${team ?? 'a team'}` : 'Private'
  return `${d.owner} · ${where}`
})

const dirty = computed(() => isDirty(props.dashboard.scope))

/**
 * Why saving isn't possible, or undefined when it is. Shown as text rather than tucked
 * into a tooltip on a disabled control: both reasons are things the user has to act on
 * (pick a different range, or duplicate the dashboard), so neither can be discoverable
 * only on hover.
 */
const blockedReason = computed(() => {
  if (props.dashboard.readonly) return 'The Trengo dashboard can’t be changed.'
  // A saved scope holds a preset, never two dates — an absolute range would freeze on
  // the day it was saved and quietly go stale.
  if (isCustomRange.value) return 'Pick a relative range like Last 30 days to save it.'
  return undefined
})

const reset = () => applyScope(props.dashboard.scope)
const save = () => saveScope(props.dashboard.id, currentScope())
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

    <!-- Only present while the working view differs from the saved one. -->
    <div v-if="dirty" class="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
      <Badge variant="muted">Filters changed</Badge>
      <span v-if="blockedReason" class="text-xs text-grey-600">{{ blockedReason }}</span>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="reset()">Reset</Button>
        <Button variant="default" size="sm" :disabled="!!blockedReason" @click="save()">
          Save to dashboard
        </Button>
      </div>
    </div>
  </header>
</template>
