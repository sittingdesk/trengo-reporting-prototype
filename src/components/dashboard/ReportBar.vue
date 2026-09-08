<script setup lang="ts">
// ReportBar — the dashboard's reports and its filters, on one row.
//
// Figma node 7050:9312. Reports are PILLS now, not underlined tabs, and they share the
// row with the filters instead of sitting above them in a separate bordered card. The
// bar has no background of its own: the design's fill is grey-100, which is the page, so
// what's left is a row with vertical padding — chrome that isn't there.
//
// Pills left, filters right. The pill strip scrolls when a dashboard has more reports
// than fit; the filters never move, because they're what you reach for most.
//
// The active report's pill doubles as its rename control (same "click to rename" as the
// dashboard title). Creating a report opens that editor straight away — a new report
// called "New report" is useless, so naming it is part of making it, not a second trip.
import { computed, nextTick, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import DateRangeFilter from '@/components/layout/filters/DateRangeFilter.vue'
import ChannelFilter from '@/components/layout/filters/ChannelFilter.vue'
import SelectFilter from '@/components/layout/filters/SelectFilter.vue'
import InlineEditName from '@/components/dashboard/InlineEditName.vue'
import Icon from '@/components/Icon.vue'
import { Tooltip } from '@/components/ui/tooltip'
import { useFilters } from '@/composables/useFilters'
import { useWorkspace } from '@/composables/useWorkspace'
import { TEAMS } from '@/data/filters'
import type { Dashboard } from '@/data/dashboards'

const props = defineProps<{ dashboard: Dashboard; activeReportId: string }>()

const router = useRouter()
const { teamIds, toggleTeam, clearTeams, applyScope, currentScope, isCustomRange, isDirty } =
  useFilters()
const { reportPath, addReport, renameReport, saveScope } = useWorkspace()

/** Which report should open its name editor — set the moment one is created. */
const autoEditId = ref('')

async function add() {
  const report = addReport(props.dashboard.id)
  if (!report) return
  await router.push(reportPath(props.dashboard.id, report.id))
  autoEditId.value = report.id
  // One-shot. Left set, the flag re-opens the editor on every re-render — so Escape and
  // blur could never dismiss it. Once the editor is open it owns its own state.
  await nextTick()
  autoEditId.value = ''
}

const dirty = computed(() => isDirty(props.dashboard.scope))

/**
 * Why saving isn't possible, or undefined when it is. In a tooltip on Save rather than as
 * standing text: the greyed button already says "not now", and a permanent sentence spent
 * its width restating that.
 */
const blockedReason = computed(() => {
  // Names the way out, since Trengo offers no duplicate action of its own.
  if (props.dashboard.readonly)
    return 'The Trengo dashboard can’t be changed. Make your own from New dashboard.'
  // A saved scope holds a preset, never two dates — an absolute range would freeze on the
  // day it was saved and quietly go stale.
  if (isCustomRange.value) return 'Pick a relative range like Last 30 days to save it.'
  return undefined
})

const reset = () => applyScope(props.dashboard.scope)
const save = () => {
  if (blockedReason.value) return
  saveScope(props.dashboard.id, currentScope())
}

// Inactive pill: filled grey, no border in the design — but it carries a TRANSPARENT one
// so it stands exactly as tall as the active pill, which does have one.
const INACTIVE_PILL =
  'inline-block max-w-[14rem] shrink-0 truncate rounded-base border border-transparent bg-grey-200 px-2 py-1.5 text-sm font-medium text-grey-700 transition-colors hover:bg-grey-300 hover:text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
</script>

<template>
  <div class="flex items-start justify-between gap-4 px-8 py-2">
    <!-- Reports -->
    <nav
      class="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scroll-thin"
      aria-label="Reports"
    >
      <template v-for="r in dashboard.reports" :key="r.id">
        <!-- The active one is a rename target, not a link to where you already are. -->
        <InlineEditName
          v-if="r.id === activeReportId"
          variant="pill"
          :name="r.name"
          :editable="!dashboard.readonly"
          :auto-edit="r.id === autoEditId"
          label="Report name"
          @rename="renameReport(dashboard.id, r.id, $event)"
        />
        <RouterLink v-else :to="reportPath(dashboard.id, r.id)" :class="INACTIVE_PILL">
          {{ r.name }}
        </RouterLink>
      </template>

      <!-- Add a report. Hidden on Trengo, which can't gain one. -->
      <Tooltip v-if="!dashboard.readonly" text="Add report">
        <button
          type="button"
          aria-label="Add report"
          class="inline-flex shrink-0 items-center justify-center rounded-base border border-grey-400 bg-grey-400 p-1 text-grey-800 shadow-100 transition-colors hover:border-grey-600 hover:bg-grey-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @click="add()"
        >
          <!-- The design draws this glyph near-white on grey-400 — 1.66:1, well under the
               3:1 a meaningful icon needs. Chip tone kept, glyph darkened to grey-800. -->
          <Icon name="Plus" :size="24" />
        </button>
      </Tooltip>
    </nav>

    <!-- Filters. Reports inherit them; there is no per-report filtering. -->
    <div class="flex shrink-0 flex-col items-end gap-1">
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

      <!-- Only present while the working view differs from the saved one. Sits under the
           filters it describes, rather than across the page as a banner. -->
      <div v-if="dirty" class="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
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
        <!-- aria-disabled, not disabled: a disabled button fires no pointer events (so the
             tooltip could never open) and leaves the tab order (so a keyboard user could
             never find out why Save is off). `save()` guards itself. -->
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
</template>
