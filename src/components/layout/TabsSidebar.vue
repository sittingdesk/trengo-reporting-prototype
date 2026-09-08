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
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import { Tooltip } from '@/components/ui/tooltip'
import { useWorkspace, type Scenario } from '@/composables/useWorkspace'
import { useSettings, type DataState } from '@/composables/useSettings'
import { useFilters } from '@/composables/useFilters'
import { SELECTABLE_ITERATIONS } from '@/config/iterations'
import { scopeLabel, type Dashboard } from '@/data/dashboards'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

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

/**
 * Removing a dashboard takes its reports and every widget in them, and nothing in this
 * prototype can undo it — so it asks first. The × is a 20px control that only appears on
 * hover, right beside the row you click to NAVIGATE, which is exactly the geometry that
 * produces accidental hits.
 */
const pendingRemoval = ref<Dashboard | null>(null)

const removalCopy = computed(() => {
  const d = pendingRemoval.value
  if (!d) return null
  const reports = d.reports.length
  const widgets = d.reports.reduce((n, r) => n + r.widgets.length, 0)
  return {
    title: `Remove \u201c${d.name}\u201d?`,
    // Both counts, because the reports are what you can see in the bar and the widgets
    // are the work that actually disappears with them.
    description:
      `Its ${reports} ${reports === 1 ? 'report' : 'reports'} and ` +
      `${widgets} ${widgets === 1 ? 'widget' : 'widgets'} go with it. ` +
      `This can\u2019t be undone.`,
  }
})

function confirmRemoval() {
  const d = pendingRemoval.value
  pendingRemoval.value = null
  if (d) removeDashboard(d.id)
}

// Split on `readonly` rather than on id, so it stays right if more than one dashboard is
// ever shipped as a default.
const defaultDashboards = computed(() => dashboards.value.filter((d) => d.readonly))
const userDashboards = computed(() => dashboards.value.filter((d) => !d.readonly))

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
               grey-600, not grey-500: that token is in neither design.md nor @theme, so
               the class emitted nothing and the icon inherited grey-900 — full-strength
               body text, which is the opposite of quiet. -->
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
          <!-- Remove on hover -->
          <button
            v-if="allowRemoveDashboard"
            class="hidden size-5 shrink-0 items-center justify-center rounded-sm text-grey-600 hover:bg-grey-300 hover:text-grey-900 group-hover:flex"
            title="Remove dashboard"
            @click.prevent.stop="pendingRemoval = d"
          >
            <Icon name="cross" :size="14" />
          </button>
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

  <ConfirmDialog
    v-if="removalCopy"
    :open="!!pendingRemoval"
    :title="removalCopy.title"
    :description="removalCopy.description"
    confirm-label="Remove dashboard"
    @update:open="(o: boolean) => { if (!o) pendingRemoval = null }"
    @confirm="confirmRemoval()"
  />
</template>
