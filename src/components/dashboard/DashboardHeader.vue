<script setup lang="ts">
// DashboardHeader — identifies the dashboard you're looking at and holds its filters.
//
// Replaces TopBar, which showed the active report's name and the global filters. Both belong to
// the dashboard now: filters are a property of the dashboard (its saved scope), not of
// the report, and reports inherit them.
//
// The header itself has no background — it sits on the page, not in a bar. The FILTERS
// do: they're grouped into one bordered card, so three chips read as one control rather
// than three loose buttons floating beside the title.
//
// Changing a filter is TEMPORARY. The row inside that card appears the moment the working
// view differs from what's saved, so you always know whether you're looking at the
// dashboard as its owner left it — and it's the only warning before switching away
// discards the change. It lives INSIDE the card because it's about those filters; as a
// separate row under the header it read as a page-level alert.
import { computed } from 'vue'
import DateRangeFilter from '@/components/layout/filters/DateRangeFilter.vue'
import ChannelFilter from '@/components/layout/filters/ChannelFilter.vue'
import SelectFilter from '@/components/layout/filters/SelectFilter.vue'
import { Tooltip } from '@/components/ui/tooltip'
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
  const team = d.teamId ? TEAMS.find((t) => t.id === d.teamId)?.label : undefined
  const where = d.visibility === 'team' ? `Shared with ${team ?? 'a team'}` : 'Private'
  return `${d.owner} · ${where}`
})

const dirty = computed(() => isDirty(props.dashboard.scope))

/**
 * Why saving isn't possible, or undefined when it is. Lives in a tooltip on Save rather
 * than as visible text: the greyed button already says "not now", so a permanent
 * sentence spent its width restating that for the whole time you browse a custom range.
 * It's the only blocked reason left, and it's self-correcting — pick a preset and it's
 * gone.
 */
const blockedReason = computed(() => {
  // A saved scope holds a preset, never two dates — an absolute range would freeze on
  // the day it was saved and quietly go stale.
  if (isCustomRange.value) return 'Pick a relative range like Last 30 days to save it.'
  return undefined
})

const reset = () => applyScope(props.dashboard.scope)
const save = () => {
  if (blockedReason.value) return
  saveScope(props.dashboard.id, currentScope())
}
</script>

<template>
  <header class="px-8 pb-4 pt-6">
    <div class="flex items-start justify-between gap-4">
      <!-- Identity -->
      <div class="min-w-0">
        <h1 class="truncate text-lg font-bold text-grey-900">{{ dashboard.name }}</h1>
        <p class="mt-0.5 truncate text-xs font-medium text-grey-600">{{ ownerLine }}</p>
      </div>

      <!-- The dashboard's filters, grouped as one control. Reports inherit them; there
           is no per-report filtering. -->
      <div class="shrink-0 rounded-2xl border border-grey-400 bg-grey-100 p-2 shadow-100">
        <div class="flex items-center gap-2">
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

        <!-- Only present while the working view differs from the saved one. -->
        <div v-if="dirty" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 py-0.5">
          <span class="flex items-center gap-2 text-sm font-medium text-grey-800">
            <span class="size-1.5 shrink-0 rounded-circle bg-leaf-500" aria-hidden="true" />
            Filters changed
          </span>
          <button
            type="button"
            class="text-sm font-medium text-grey-700 transition-colors hover:text-grey-900 focus:outline-none focus-visible:underline"
            @click="reset()"
          >
            Reset
          </button>
          <!-- aria-disabled, not disabled: a disabled button fires no pointer events
               (so the tooltip would never open) and leaves the tab order (so a keyboard
               user could never find out why Save is off). `save()` guards itself. -->
          <Tooltip :text="blockedReason">
            <button
              type="button"
              :aria-disabled="blockedReason ? true : undefined"
              class="h-5 rounded-lg bg-grey-900 px-2 text-sm font-medium text-grey-100 transition-colors hover:bg-grey-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:cursor-not-allowed aria-disabled:bg-grey-400 aria-disabled:hover:bg-grey-400"
              @click="save()"
            >
              Save
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  </header>
</template>
