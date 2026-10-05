<script setup lang="ts">
// TabsSidebar — the second left sidebar: the user's DASHBOARDS.
//
// Trengo leads, then the user's own, separated by a gap rather than by headings — with
// two groups, "Trengo" and "Your dashboards" labelled more than they organised. 8px, not
// 16: the rows inside a group sit flush, so 8px already reads as a separator, where 16
// read as a break in the list. Each row
// shows its saved scope as a subtitle, so two dashboards are
// told apart by what they actually look at rather than by name alone. Clicking one opens
// its first report; the reports themselves live in the tab row inside the dashboard, not here.
// At the bottom sits a clearly-labelled PROTOTYPE scenario switcher to demo the
// "existing customer" (seeded) vs "new customer" (empty) onboarding states.
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import { Tooltip } from '@/components/ui/tooltip'
import { useWorkspace, type Scenario } from '@/composables/useWorkspace'
import { useSettings, type DataState, DEFAULT_HUMAN_ONLY_VIEW, type HumanOnlyView } from '@/composables/useSettings'
import { useFilters } from '@/composables/useFilters'
import { SELECTABLE_ITERATIONS } from '@/config/iterations'
import { scopeLabel } from '@/data/dashboards'

const route = useRoute()
const router = useRouter()
const {
  dashboards,
  scenario,
  iterationId,
  allowNewDashboard,
  allowScenarioToggle,
  openNewDashboard,
  dashboardPath,
  setScenario,
  setIteration,
  resetPrototype: resetWorkspace,
} = useWorkspace()

/** The dashboard currently open, straight from the route. */
const activeId = computed(() => String(route.params.dashboardId ?? ''))

// Split on `readonly` rather than on id, so it stays right if more than one dashboard is
// ever shipped as a default.
const defaultDashboards = computed(() => dashboards.value.filter((d) => d.readonly))
const userDashboards = computed(() => dashboards.value.filter((d) => !d.readonly))

const { setSla, dataState, setDataState, humanOnlyView, setHumanOnlyView } = useSettings()
const { applyScope } = useFilters()

/**
 * Back to first load: the seeded dashboard, its default filters, SLA off, Normal data.
 * Everything in this panel AND the workspace — "the starting point" means the whole demo,
 * and a switch you wanted on is one click to restore, whereas a dashboard you removed and
 * a scope you saved over are not.
 */
function resetPrototype() {
  const d = resetWorkspace()
  setSla(false)
  setDataState('normal')
  setHumanOnlyView(DEFAULT_HUMAN_ONLY_VIEW)
  // The reseeded dashboard keeps its slug id, so DashboardView's scope watcher — keyed on
  // that id — won't refire. Apply the fresh scope here or the old filters would survive a
  // reset, which is the one thing it must not do.
  if (d) applyScope(d.scope)
  router.push(d ? dashboardPath(d.id) : '/welcome')
}

const scenarios: { id: Scenario; label: string }[] = [
  { id: 'existing', label: 'Existing customer' },
  { id: 'new', label: 'New customer' },
]

// The two patterns under consideration for the All / Human only pair — see useSettings.
const humanOnlyViews: { id: HumanOnlyView; label: string }[] = [
  { id: 'toggle', label: 'Menu toggle' },
  { id: 'inline', label: 'Inline picker' },
]

// One icon per state, each named by its tooltip and its accessible name.
const dataStates: { id: DataState; label: string; icon: string }[] = [
  { id: 'normal', label: 'Normal', icon: 'ChartBar' },
  { id: 'loading', label: 'Loading', icon: 'Loader' },
  { id: 'empty', label: 'Empty', icon: 'Inbox' },
  { id: 'error', label: 'Error', icon: 'AlertTriangle' },
]

// After changing scenario/iteration, land on the first visible report (or welcome).
function goToFirstReport() {
  router.push(dashboards.value.length ? dashboardPath(dashboards.value[0].id) : '/welcome')
}

function switchScenario(id: Scenario) {
  setScenario(id)
  goToFirstReport()
}

function changeIteration(id: string) {
  setIteration(id)
  goToFirstReport()
}
</script>

<template>
  <aside class="flex w-60 shrink-0 flex-col border-r border-grey-300 bg-white">
    <!-- Heading + create -->
    <div class="flex items-center justify-between px-4 pb-2 pt-5">
      <h2 class="text-lg font-bold text-grey-900">Analytics</h2>
      <button
        v-if="allowNewDashboard"
        class="flex size-7 items-center justify-center rounded-base text-grey-600 transition-colors hover:bg-grey-200 hover:text-grey-900"
        title="New dashboard"
        @click="openNewDashboard()"
      >
        <span class="text-lg leading-none">+</span>
      </button>
    </div>

    <!-- Dashboard list -->
    <nav class="flex flex-1 flex-col gap-2 overflow-y-auto px-2 py-1 scroll-thin" aria-label="Dashboards">
      <!-- Trengo. Navigation only — no remove, and its name isn't editable either. Same
           shape as a user row so the trailing slot lines up: the lock sits where the
           remove ✕ does, and the right edge consistently means "this row's status or
           action". The lock is the ONLY signal left that this dashboard is different,
           now that the "Trengo · Default dashboard" line under the title is gone —
           everything else about it is an absence. -->
      <div v-if="defaultDashboards.length">
        <RouterLink
          v-for="d in defaultDashboards"
          :key="d.id"
          :to="dashboardPath(d.id)"
          class="flex items-center gap-2 rounded-base px-2.5 py-2 transition-colors hover:bg-grey-200"
          :class="d.id === activeId ? 'bg-grey-200' : ''"
        >
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              class="truncate text-sm font-medium"
              :class="d.id === activeId ? 'text-grey-900' : 'text-grey-700'"
            >{{ d.name }}</span>
            <span class="truncate text-xs text-grey-600">{{ scopeLabel(d.scope) }}</span>
          </span>
          <!-- Lock2 (the padlock) rather than Lock (the round one), and 16px: design.md
               §8 gives three render sizes — 16 / 20 / 32 — and the 12 this started at
               isn't one of them, which is part of why it read as undersized.
               grey-600, not grey-500. When this was written grey-500 was in neither
               design.md nor @theme, so the class emitted nothing and the icon inherited
               grey-900 — full-strength body text, the opposite of quiet. The token exists
               now, and grey-600 is still right: at 1.89:1 grey-500 is a border and divider
               colour, and anything carrying meaning wants the 4.60:1 stop. -->
          <Tooltip text="Can’t be changed. Make your own from New dashboard.">
            <span
              class="flex size-5 shrink-0 items-center justify-center text-grey-600"
              role="img"
              aria-label="Read-only"
            >
              <Icon name="Lock2" :size="16" />
            </span>
          </Tooltip>
        </RouterLink>
      </div>

      <div>
        <RouterLink
          v-for="d in userDashboards"
          :key="d.id"
          :to="dashboardPath(d.id)"
          class="group flex items-center gap-2 rounded-base px-2.5 py-2 transition-colors hover:bg-grey-200"
          :class="d.id === activeId ? 'bg-grey-200' : ''"
        >
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              class="truncate text-sm font-medium"
              :class="d.id === activeId ? 'text-grey-900' : 'text-grey-700'"
            >{{ d.name }}</span>
            <span class="truncate text-xs text-grey-600">{{ scopeLabel(d.scope) }}</span>
          </span>
          <!-- No remove control here. It lives in the ⋯ menu on the dashboard's own
               header, where it sits beside the dashboard it acts on and doesn't have to
               be discovered by hovering. A hover-only ✕ two pixels from the row you
               click to navigate was also the geometry that produced accidental hits. -->
        </RouterLink>

      </div>
    </nav>

    <!-- Prototype-only controls -->
    <div class="space-y-3 border-t border-grey-300 p-3">
      <!-- Names the block, and gives the reset somewhere to live. The group labels below
           ("Features", "Data state") had nothing above them saying what they belonged to. -->
      <div class="flex items-center justify-between">
        <div class="text-xs font-semibold text-grey-700">Prototype</div>
        <button
          class="flex size-6 items-center justify-center rounded-base text-grey-600 transition-colors hover:bg-grey-200 hover:text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Reset to the starting point"
          @click="resetPrototype()"
        >
          <Icon name="RotateCcw" :size="14" />
        </button>
      </div>
      <!-- Iteration (feature-flag set) — temporarily hidden, bring back later.
           The active iteration still applies; only the picker is hidden. -->
      <div v-if="false">
        <div class="mb-1.5 text-xs font-medium text-grey-600">Iteration</div>
        <select
          class="w-full truncate rounded-base border border-grey-300 bg-white px-2 py-1.5 text-xs font-medium text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :value="iterationId"
          @change="changeIteration(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="it in SELECTABLE_ITERATIONS" :key="it.id" :value="it.id">{{ it.label }}</option>
        </select>
      </div>

      <div v-if="allowScenarioToggle">
        <div class="mb-1.5 text-xs font-medium text-grey-600">Prototype scenario</div>
        <div class="flex gap-1 rounded-base bg-grey-200 p-0.5">
          <button
            v-for="s in scenarios"
            :key="s.id"
            class="flex-1 rounded-sm px-2 py-1 text-xs font-semibold transition-colors"
            :class="
              scenario === s.id
                ? 'bg-white text-grey-900 shadow-100'
                : 'text-grey-600 hover:text-grey-900'
            "
            @click="switchScenario(s.id)"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- Data state (viewing mode): force every card into normal / loading / empty /
           error. One row — label left, four 24px icon buttons right — where it used to be
           a label over a 2×2 grid of words: three rows of a 240px sidebar for a switch you
           flip a few times per demo. The words moved into each button's tooltip and
           accessible name, so nothing is icon-only for a screen reader or on hover.
           (The SLA feature switch that sat above this was removed, 2026-10-05: SLA stays
           off, as it always was by default — `slaEnabled` in useSettings.) -->
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-medium text-grey-600">Data state</span>
        <div class="flex gap-0.5 rounded-base bg-grey-200 p-0.5" role="group" aria-label="Data state">
          <Tooltip v-for="d in dataStates" :key="d.id" :text="d.label">
            <button
              type="button"
              class="flex size-6 items-center justify-center rounded-sm transition-colors focus:outline-none focus-visible:shadow-focus-sm"
              :class="
                dataState === d.id
                  ? 'bg-white text-grey-900 shadow-100'
                  : 'text-grey-600 hover:text-grey-900'
              "
              :aria-label="d.label"
              :aria-pressed="dataState === d.id"
              @click="setDataState(d.id)"
            >
              <Icon :name="d.icon" :size="16" />
            </button>
          </Tooltip>
        </div>
      </div>

      <!-- Human-only view: a DESIGN comparison, not a data state. Flips First response time
           and Resolution time between choosing the view from the ⋯ menu and choosing it from
           the label beside the number, so the two patterns can be judged on the real page. -->
      <div>
        <div class="mb-1.5 text-xs font-medium text-grey-600">Human-only view</div>
        <div class="grid grid-cols-2 gap-1 rounded-base bg-grey-200 p-0.5">
          <button
            v-for="v in humanOnlyViews"
            :key="v.id"
            class="rounded-sm px-2 py-1 text-xs font-semibold transition-colors"
            :class="
              humanOnlyView === v.id
                ? 'bg-white text-grey-900 shadow-100'
                : 'text-grey-600 hover:text-grey-900'
            "
            :aria-pressed="humanOnlyView === v.id"
            @click="setHumanOnlyView(v.id)"
          >
            {{ v.label }}
          </button>
        </div>
      </div>
    </div>
  </aside>

</template>
