<script setup lang="ts">
// TabsSidebar — the second left sidebar: the user's DASHBOARDS.
//
// One flat list — there is no read-only default to separate out any more, so there is
// nothing to group. Each row shows its saved scope as a subtitle, so two dashboards are
// told apart by what they actually look at rather than by name alone. Clicking one opens
// its first report; the reports themselves live in the tab row inside the dashboard, not here.
// At the bottom sits a clearly-labelled PROTOTYPE scenario switcher to demo the
// "existing customer" (seeded) vs "new customer" (empty) onboarding states.
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import { useWorkspace, type Scenario } from '@/composables/useWorkspace'
import { useSettings, type DataState } from '@/composables/useSettings'
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
  allowRemoveDashboard,
  allowScenarioToggle,
  openNewDashboard,
  removeDashboard,
  dashboardPath,
  setScenario,
  setIteration,
  resetPrototype: resetWorkspace,
} = useWorkspace()

/** The dashboard currently open, straight from the route. */
const activeId = computed(() => String(route.params.dashboardId ?? ''))

const { slaEnabled, toggleSla, setSla, dataState, setDataState } = useSettings()
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

const dataStates: { id: DataState; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'loading', label: 'Loading' },
  { id: 'empty', label: 'Empty' },
  { id: 'error', label: 'Error' },
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
    <nav class="flex flex-1 flex-col overflow-y-auto px-2 py-1 scroll-thin" aria-label="Dashboards">
      <div>
        <RouterLink
          v-for="d in dashboards"
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
          <!-- Remove on hover -->
          <button
            v-if="allowRemoveDashboard"
            class="hidden size-5 shrink-0 items-center justify-center rounded-sm text-grey-500 hover:bg-grey-300 hover:text-grey-900 group-hover:flex"
            title="Remove dashboard"
            @click.prevent.stop="removeDashboard(d.id)"
          >
            <Icon name="cross" :size="14" />
          </button>
        </RouterLink>

        <!-- New dashboard sits at the bottom of the list -->
        <button
          v-if="allowNewDashboard"
          class="mt-1 flex w-full items-center gap-2 rounded-base px-2.5 py-2 text-sm font-medium text-grey-600 transition-colors hover:bg-grey-200 hover:text-grey-900"
          @click="openNewDashboard()"
        >
          <span class="text-base leading-none">+</span> New dashboard
        </button>
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

      <!-- Feature availability. Unlike the switches below it, this one changes WHICH
           widgets a page has, not how they look: metrics that need an SLA policy
           don't exist without one, so they're absent rather than empty. -->
      <div>
        <div class="mb-1.5 text-xs font-medium text-grey-600">Features</div>
        <button
          class="flex w-full items-center justify-between rounded-base px-1 text-xs font-medium text-grey-600"
          @click="toggleSla()"
        >
          <span>SLA</span>
          <span
            class="relative h-4 w-7 rounded-pill transition-colors"
            :class="slaEnabled ? 'bg-leaf-500' : 'bg-grey-300'"
          >
            <span
              class="absolute top-0.5 size-3 rounded-circle bg-white transition-all"
              :class="slaEnabled ? 'left-3.5' : 'left-0.5'"
            />
          </span>
        </button>
      </div>

      <!-- Data state (viewing mode): force every card into normal / loading / empty /
           error. 2×2 grid — four labels don't fit on one row in a 240px sidebar. -->
      <div>
        <div class="mb-1.5 text-xs font-medium text-grey-600">Data state</div>
        <div class="grid grid-cols-2 gap-1 rounded-base bg-grey-200 p-0.5">
          <button
            v-for="d in dataStates"
            :key="d.id"
            class="rounded-sm px-2 py-1 text-xs font-semibold transition-colors"
            :class="
              dataState === d.id
                ? 'bg-white text-grey-900 shadow-100'
                : 'text-grey-600 hover:text-grey-900'
            "
            @click="setDataState(d.id)"
          >
            {{ d.label }}
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
