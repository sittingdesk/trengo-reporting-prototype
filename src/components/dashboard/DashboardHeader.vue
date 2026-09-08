<script setup lang="ts">
// DashboardHeader — the title row: which dashboard you're looking at, who owns it, and
// the filters it's scoped by.
//
// The filters sit HERE rather than beside the report pills, which is where the Figma bar
// put them (7050:9312). Two reasons, and the prototype deliberately diverges:
//
// The scope belongs to the DASHBOARD — reports inherit it, there is no per-report
// filtering. Next to the report tabs it reads as filtering the report; on the title row it
// reads as filtering the dashboard, which is what it does. It's also where analytics
// products conventionally put a date range, so it's where people look.
//
// And it hands the pill strip the whole row. Sharing with 432px of filters, twelve reports
// showed five pills at 1440; with the row to themselves, nine. The title is the cheaper
// thing to squeeze — one line that truncates with a tooltip, against a strip of navigation
// where truncation costs you access.
//
// The name is the page's h1 and is renamed in place. The element stays an h1 (it IS the
// page title, and there's no h1/h2 above it to nest under); "H3" is the type style.
//
// No owner line: whose dashboard it is, and who can see it, is not what you came to this
// page to read. `Dashboard.owner` / `visibility` / `teamId` still carry it — nothing in
// the UI renders them now, and a sharing surface is where they'd resurface.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import DateRangeFilter from '@/components/layout/filters/DateRangeFilter.vue'
import ChannelFilter from '@/components/layout/filters/ChannelFilter.vue'
import SelectFilter from '@/components/layout/filters/SelectFilter.vue'
import InlineEditName from '@/components/dashboard/InlineEditName.vue'
import { Tooltip } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import Icon from '@/components/Icon.vue'
import { useFilters } from '@/composables/useFilters'
import { useWorkspace } from '@/composables/useWorkspace'
import { TEAMS } from '@/data/filters'
import type { Dashboard } from '@/data/dashboards'

const props = defineProps<{ dashboard: Dashboard }>()

const { teamIds, toggleTeam, clearTeams, applyScope, currentScope, isCustomRange, isDirty } =
  useFilters()
const { saveScope, renameDashboard, editing, setEditing, removeDashboard } = useWorkspace()

// Full-width filters cost 432px. Below this the title would be left under ~140px — less
// than the ~185px a name like "My dashboard" needs — so Channel and Team drop their
// labels. Observed on the row itself, because the sidebar takes 296px and viewport width
// is a poor proxy for the space this row actually has.
const COMPACT_ROW = 800
const rowEl = ref<HTMLElement | null>(null)
const rowW = ref(0)
let ro: ResizeObserver | undefined
onMounted(() => {
  ro = new ResizeObserver(([e]) => (rowW.value = e.contentRect.width))
  if (rowEl.value) ro.observe(rowEl.value)
})
onBeforeUnmount(() => ro?.disconnect())
const compactFilters = computed(() => rowW.value > 0 && rowW.value < COMPACT_ROW)

/**
 * Edit mode. A real mode rather than always-on editing, because drag-and-drop is coming:
 * once a card can be dragged, every mousedown on one is ambiguous between "interact with
 * this" and "move this". An explicit mode resolves that, and gives add / remove /
 * rearrange one home instead of three scattered affordances.
 *
 * The trigger sits here, far right of the title row, because that's where Figma 7050:9312
 * put it and because this row already owns the dashboard-level things — its name and its
 * scope. Measured: with the filters also on this row, a typical name still fits beside
 * both down to a 1024px viewport.
 */
const toggleEdit = () => setEditing(!editing.value, props.dashboard.id)

/**
 * The ⋯ menu beside Edit — dashboard-level actions that aren't frequent enough to spend
 * a button on. It holds Remove for now, which is the one such action that exists;
 * Duplicate is the obvious neighbour and needs its own piece of work.
 *
 * Absent on Trengo for the same reason Edit is: every action in it would refuse.
 */
const menuOpen = ref(false)
const confirmRemove = ref(false)

const removalCopy = computed(() => {
  const d = props.dashboard
  const reports = d.reports.length
  const widgets = d.reports.reduce((n, r) => n + r.widgets.length, 0)
  return {
    title: `Remove \u201c${d.name}\u201d?`,
    description:
      `Its ${reports} ${reports === 1 ? 'report' : 'reports'} and ` +
      `${widgets} ${widgets === 1 ? 'widget' : 'widgets'} go with it. This can\u2019t be undone.`,
  }
})

/**
 * Closing a popover returns focus to its trigger, and that restore lands AFTER the
 * confirm dialog has parked focus on Cancel — so the dialog opened with focus back out
 * on the ⋯ button, which is exactly the "a stray Enter can't be the destructive answer"
 * guarantee gone. Suppress the restore for this one transition only: an Escape or a
 * click outside still gets it, or focus would be left nowhere.
 */
const handOffFocus = ref(false)

function askRemove() {
  handOffFocus.value = true
  menuOpen.value = false
  confirmRemove.value = true
}

function onMenuCloseFocus(event: Event) {
  if (!handOffFocus.value) return
  handOffFocus.value = false
  event.preventDefault()
}

function doRemove() {
  confirmRemove.value = false
  // The route stops resolving the moment this dashboard is gone; DashboardView's guard
  // catches that and replaces the route, so there is nothing to navigate here.
  removeDashboard(props.dashboard.id)
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
</script>

<template>
  <header ref="rowEl" class="px-8 pt-6">
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h1 class="min-w-0 flex-1">
        <InlineEditName
          :name="dashboard.name"
          :editable="!dashboard.readonly"
          label="Dashboard name"
          @rename="renameDashboard(dashboard.id, $event)"
        />
      </h1>

      <!-- Scope, then Edit. Both belong to the dashboard, so both belong on its row. -->
      <div class="flex shrink-0 flex-col items-end gap-1">
        <div class="flex items-center gap-2">
          <!-- Never compact: with no active state, this label is the only thing telling
               you which period you're looking at. -->
          <DateRangeFilter />
          <ChannelFilter :compact="compactFilters" />
          <SelectFilter
            label="Team"
            icon="Users"
            :options="TEAMS"
            :selected-ids="teamIds"
            :compact="compactFilters"
            @toggle="toggleTeam"
            @clear="clearTeams"
          />

          <!-- Absent on Trengo, not disabled: there is nothing to edit, and a control
               that refuses is worse than no control. Drops its label when the row is
               tight, on the same signal the filters use — one rule, "when space runs
               short, controls lose their words before navigation does".
               `field`, not `outline`: it wears the same surface as the chips it sits
               beside, so the row reads as one set of controls, and only the radius
               differs (buttons stay `pill`, per design.md §7.5). In edit mode it goes
               dark — the one state that should NOT look like a filter. -->
          <Button
            v-if="!dashboard.readonly"
            :variant="editing ? 'default' : 'field'"
            :size="compactFilters ? 'icon' : 'sm'"
            :aria-label="compactFilters ? (editing ? 'Done editing' : 'Edit dashboard') : undefined"
            :title="compactFilters ? (editing ? 'Done editing' : 'Edit dashboard') : undefined"
            @click="toggleEdit()"
          >
            <Icon :name="editing ? 'Check' : 'Edit'" :size="20" />
            <span v-if="!compactFilters">{{ editing ? 'Done' : 'Edit' }}</span>
          </Button>

          <!-- Dashboard actions. 32×32 on the same surface, so at `pill` radius it reads
               as the circular button design.md §3.3 documents. It keeps its label off
               screen at every width: a ⋯ has no words to lose. -->
          <Popover v-if="!dashboard.readonly" v-model:open="menuOpen">
            <PopoverTrigger as-child>
              <Button variant="field" size="icon" aria-label="Dashboard actions">
                <Icon name="MoreHoriz" :size="20" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" class="w-52" @close-auto-focus="onMenuCloseFocus">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-base px-2 py-1.5 text-left text-sm text-grey-900 transition-colors hover:bg-grey-100 hover:text-error-500 focus:outline-none focus-visible:bg-grey-100"
                @click="askRemove()"
              >
                <Icon name="Trash" :size="16" />
                <span class="truncate">Remove dashboard</span>
              </button>
            </PopoverContent>
          </Popover>
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
          <!-- aria-disabled, not disabled: a disabled button fires no pointer events (so
               the tooltip could never open) and leaves the tab order (so a keyboard user
               could never find out why Save is off). `save()` guards itself. -->
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

    <ConfirmDialog
      :open="confirmRemove"
      :title="removalCopy.title"
      :description="removalCopy.description"
      confirm-label="Remove dashboard"
      @update:open="confirmRemove = $event"
      @confirm="doRemove()"
    />
  </header>
</template>
