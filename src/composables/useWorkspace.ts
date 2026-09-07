// useWorkspace — the prototype's workspace state.
//
// Dashboard → Tab → Widget (see src/data/dashboards.ts). A module-level reactive
// singleton: import it anywhere and you share the same state (no Pinia needed for a
// prototype this size). Holds the dashboards, the demo "scenario", and whether the
// template gallery is open.
//
// `tabs` is still exposed as a FLAT list across every dashboard so the sidebar, router
// and header keep working while the dashboard UI lands one surface at a time.
//
// ⚠️ Persistence is mocked: the chosen scenario is saved to localStorage and reseeds
// on load. Real per-user persistence needs a backend DB (TECH_FOUNDATION §5).
import { reactive, computed } from 'vue'
import { getTemplate, LEGACY_REPORT_TEMPLATE_IDS } from '@/config/templates'
import { getIteration, DEFAULT_ITERATION_ID } from '@/config/iterations'
import {
  buildTrengoDashboard,
  tabFromTemplate,
  DEFAULT_SCOPE,
  type Dashboard,
  type DashboardTab,
} from '@/data/dashboards'

/** Kept as an alias so existing consumers read naturally. */
export type Tab = DashboardTab

/** Demo onboarding scenarios (prototype-only). */
export type Scenario = 'existing' | 'new'

/** The demo user — owner of anything created in the prototype. */
export const DEMO_USER = 'Jeff van Steijn'

const SCENARIO_KEY = 'trengo-scenario-v1'
const ITERATION_KEY = 'trengo-iteration-v1'

function loadScenario(): Scenario {
  return localStorage.getItem(SCENARIO_KEY) === 'new' ? 'new' : 'existing'
}

function loadIteration(): string {
  const id = localStorage.getItem(ITERATION_KEY)
  // Ignore a persisted id that no longer resolves or is now disabled.
  return id && getIteration(id) && !getIteration(id)?.disabled ? id : DEFAULT_ITERATION_ID
}

const state = reactive({
  scenario: loadScenario() as Scenario,
  // Prototype "iteration" (feature-flag set) — hides pages / new-dashboard
  // triggers to demo rollout states. Persisted like the scenario.
  iterationId: loadIteration(),
  dashboards: [] as Dashboard[],
  // Existing customers see a one-time welcome step (choose new vs legacy) before
  // anything is seeded. New customers skip it. Not persisted, so the demo
  // re-shows it on reload / scenario toggle.
  needsChoice: false,
  galleryOpen: false,
})

let counter = 0
function makeId(prefix: string) {
  counter += 1
  return `${prefix}-${counter}`
}

/** The legacy reports, rebuilt — one user dashboard holding the four old tabs. */
function buildLegacyDashboard(): Dashboard {
  return {
    id: makeId('legacy'),
    name: 'My reports',
    owner: DEMO_USER,
    visibility: 'private',
    scope: { ...DEFAULT_SCOPE },
    tabs: LEGACY_REPORT_TEMPLATE_IDS.map((t) => tabFromTemplate(t, makeId(t))),
    readonly: false,
  }
}

/** Apply a scenario's starting state: new → the Trengo default; existing → ask first. */
function applyScenario(scenario: Scenario) {
  if (scenario === 'new') {
    state.dashboards = [buildTrengoDashboard()]
    state.needsChoice = false
  } else {
    state.dashboards = []
    state.needsChoice = true
  }
}

// Iterations that lock the scenario always show the seeded ("filled") dashboard.
if (getIteration(state.iterationId)?.allowScenarioToggle === false) state.scenario = 'new'

// Initialise from the (possibly forced) scenario.
applyScenario(state.scenario)

function allTabs(): DashboardTab[] {
  return state.dashboards.flatMap((d) => d.tabs)
}

/** Ensure a unique tab name ("Voice", "Voice 2", …) across every dashboard. */
function uniqueName(base: string): string {
  const existing = new Set(allTabs().map((t) => t.name))
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}

export function useWorkspace() {
  const dashboards = computed(() => state.dashboards)

  // Every tab, flat, minus the pages the current iteration hides (by template provenance).
  const tabs = computed(() => {
    const hidden = getIteration(state.iterationId)?.hiddenTemplateIds ?? []
    const all = allTabs()
    return hidden.length ? all.filter((t) => !t.templateId || !hidden.includes(t.templateId)) : all
  })
  const scenario = computed(() => state.scenario)
  const iterationId = computed(() => state.iterationId)
  const allowNewDashboard = computed(() => getIteration(state.iterationId)?.allowNewDashboard ?? true)
  const allowRemoveDashboard = computed(() => getIteration(state.iterationId)?.allowRemoveDashboard ?? true)
  const allowScenarioToggle = computed(() => getIteration(state.iterationId)?.allowScenarioToggle ?? true)
  const needsChoice = computed(() => state.needsChoice)
  const galleryOpen = computed(() => state.galleryOpen)

  function getDashboard(id: string): Dashboard | undefined {
    return state.dashboards.find((d) => d.id === id)
  }

  function getTab(id: string): DashboardTab | undefined {
    return allTabs().find((t) => t.id === id)
  }

  /** The dashboard a tab belongs to. */
  function dashboardOf(tabId: string): Dashboard | undefined {
    return state.dashboards.find((d) => d.tabs.some((t) => t.id === tabId))
  }

  /** A dashboard's first tab that the current iteration doesn't hide. */
  function firstTabOf(dashboardId: string): DashboardTab | undefined {
    const d = getDashboard(dashboardId)
    if (!d) return undefined
    const allowed = new Set(tabs.value.map((t) => t.id))
    return d.tabs.find((t) => allowed.has(t.id))
  }

  /** Route to a dashboard — lands on its first visible tab. */
  function dashboardPath(dashboardId: string): string {
    const t = firstTabOf(dashboardId)
    return t ? `/d/${dashboardId}/${t.id}` : '/welcome'
  }

  /** Route to a tab — the one place that knows the URL shape. */
  function tabPath(tabId: string): string {
    const d = dashboardOf(tabId)
    return d ? `/d/${d.id}/${tabId}` : '/welcome'
  }

  /**
   * "New dashboard" from the gallery: a private user dashboard holding one tab copied
   * from the template. Returns the tab (the caller navigates to it). An optional `name`
   * lets the picker use a user-typed name; names are de-duplicated either way.
   */
  function createFromTemplate(templateId: string, name?: string): DashboardTab {
    const t = getTemplate(templateId)
    const tabName = uniqueName(name?.trim() || t?.name || templateId)
    const tab = tabFromTemplate(templateId, makeId(templateId), tabName)
    state.dashboards.push({
      id: makeId('dash'),
      name: tabName,
      owner: DEMO_USER,
      visibility: 'private',
      scope: { ...DEFAULT_SCOPE },
      tabs: [tab],
      readonly: false,
    })
    return tab
  }

  /** Remove a tab. A user dashboard left with no tabs goes with it — a tab used to BE
   *  the dashboard, so this keeps today's behaviour until step 17 adds an empty state. */
  function removeTab(id: string) {
    const d = dashboardOf(id)
    if (!d) return
    d.tabs = d.tabs.filter((t) => t.id !== id)
    if (!d.readonly && d.tabs.length === 0) {
      state.dashboards = state.dashboards.filter((x) => x.id !== d.id)
    }
  }

  /** Remove a whole dashboard. The Trengo default can't be removed. */
  function removeDashboard(id: string) {
    const d = getDashboard(id)
    if (!d || d.readonly) return
    state.dashboards = state.dashboards.filter((x) => x.id !== id)
  }

  /** Switch demo scenario — persists and applies its starting state. */
  function setScenario(next: Scenario) {
    state.scenario = next
    localStorage.setItem(SCENARIO_KEY, next)
    applyScenario(next)
  }

  /** Switch prototype iteration (feature-flag set) — persists. */
  function setIteration(id: string) {
    state.iterationId = id
    localStorage.setItem(ITERATION_KEY, id)
    // Iterations that lock the scenario force the seeded ("filled") dashboard.
    if (getIteration(id)?.allowScenarioToggle === false && state.scenario !== 'new') {
      state.scenario = 'new'
      applyScenario('new')
    }
  }

  /**
   * Resolve the existing-customer welcome step.
   *  - 'new'   → the Trengo default dashboard
   *  - 'old'   → the legacy reports, rebuilt as one user dashboard
   *  - 'later' → nothing (generic empty state)
   * Returns the first tab so the caller can navigate. Non-destructive: every
   * template stays available in the gallery regardless of choice.
   */
  function chooseStart(kind: 'new' | 'old' | 'later'): DashboardTab | undefined {
    if (kind === 'new') state.dashboards = [buildTrengoDashboard()]
    else if (kind === 'old') state.dashboards = [buildLegacyDashboard()]
    else state.dashboards = []
    state.needsChoice = false
    return allTabs()[0]
  }

  const openGallery = () => (state.galleryOpen = true)
  const closeGallery = () => (state.galleryOpen = false)

  return {
    dashboards,
    tabs,
    scenario,
    iterationId,
    allowNewDashboard,
    allowRemoveDashboard,
    allowScenarioToggle,
    needsChoice,
    galleryOpen,
    getDashboard,
    getTab,
    dashboardOf,
    firstTabOf,
    dashboardPath,
    tabPath,
    removeDashboard,
    createFromTemplate,
    removeTab,
    setScenario,
    setIteration,
    chooseStart,
    openGallery,
    closeGallery,
  }
}
