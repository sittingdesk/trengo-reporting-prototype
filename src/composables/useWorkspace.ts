// useWorkspace — the prototype's workspace state.
//
// Dashboard → Report → Widget (see src/data/dashboards.ts). A module-level reactive
// singleton: import it anywhere and you share the same state (no Pinia needed for a
// prototype this size). Holds the dashboards, the demo "scenario", and whether the
// template gallery is open.
//
// `reports` is still exposed as a FLAT list across every dashboard so the sidebar, router
// and header keep working while the dashboard UI lands one surface at a time.
//
// ⚠️ Persistence is mocked: the chosen scenario is saved to localStorage and reseeds
// on load. Real per-user persistence needs a backend DB (TECH_FOUNDATION §5).
import { reactive, computed } from 'vue'
import {
  getTemplate,
  LEGACY_REPORT_TEMPLATE_IDS,
  QUESTION_LED_TEMPLATE_IDS,
} from '@/config/templates'
import { getIteration, DEFAULT_ITERATION_ID } from '@/config/iterations'
import {
  reportFromTemplate,
  slugify,
  DEFAULT_SCOPE,
  type Dashboard,
  type Report,
  type SavedScope,
} from '@/data/dashboards'


/** Demo onboarding scenarios (prototype-only). */
export type Scenario = 'existing' | 'new'

/** Owner of anything created in the prototype. "You" rather than a name: it reads
 *  naturally in a demo, and the real product substitutes the signed-in user. */
export const DEMO_USER = 'You'

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
  newDashboardOpen: false,
})


/** Ensure an id is free, appending -2, -3 … Ids are in the URL, so they must be unique
 *  among dashboards, and among one dashboard's reports. */
function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/** A dashboard holding one report per template id — an ordinary user dashboard, whatever
 *  it was built from. `[]` gives a dashboard with no reports.
 *  Reports take their template id as their own, so deep links read well and stay stable
 *  for anything seeded (see `slugify`). */
function buildDashboard(name: string, templateIds: string[]): Dashboard {
  const takenIds = new Set(state.dashboards.map((d) => d.id))
  const reportIds = new Set<string>()
  return {
    id: uniqueId(slugify(name), takenIds),
    name: uniqueName(name, state.dashboards.map((d) => d.name)),
    owner: DEMO_USER,
    visibility: 'private',
    scope: { ...DEFAULT_SCOPE },
    reports: templateIds.map((t) => {
      const id = uniqueId(t, reportIds)
      reportIds.add(id)
      return reportFromTemplate(t, id)
    }),
  }
}

/** The name a freshly seeded workspace opens with. Deliberately not "Trengo": the
 *  dashboard is the user's from the moment it exists, and every customer is Trengo's
 *  customer, so "Trengo" would read as internal-speak on their own dashboard. */
const SEED_NAME = 'My dashboard'

/** Apply a scenario's starting state: new → seeded from the recommended set;
 *  existing → ask first. */
function applyScenario(scenario: Scenario) {
  state.dashboards = []
  if (scenario === 'new') {
    state.dashboards.push(buildDashboard(SEED_NAME, QUESTION_LED_TEMPLATE_IDS))
    state.needsChoice = false
  } else {
    state.needsChoice = true
  }
}

// Iterations that lock the scenario always show the seeded ("filled") dashboard.
if (getIteration(state.iterationId)?.allowScenarioToggle === false) state.scenario = 'new'

// Initialise from the (possibly forced) scenario. Must stay at module scope: the router's
// "/" redirect runs during the first navigation and needs a populated array — from
// onMounted or a guard it would land on /welcome and never correct itself.
applyScenario(state.scenario)

function allReports(): Report[] {
  return state.dashboards.flatMap((d) => d.reports)
}

/** Ensure a unique display name ("Overview", "Overview 2", …) among `existing`.
 *  Takes names rather than a collection so it serves both grains: dashboard names must be
 *  unique across the workspace, report names only within their dashboard. It used to be
 *  called with an empty list for a brand-new dashboard, which made it a no-op — so two
 *  dashboards from one template were both "Overview" with an identical scope subtitle,
 *  indistinguishable in the sidebar. */
function uniqueName(base: string, existing: string[]): string {
  const taken = new Set(existing)
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}

export function useWorkspace() {
  const dashboards = computed(() => state.dashboards)

  // Every report, flat, minus the pages the current iteration hides (by template provenance).
  const reports = computed(() => {
    const hidden = getIteration(state.iterationId)?.hiddenTemplateIds ?? []
    const all = allReports()
    return hidden.length ? all.filter((t) => !t.templateId || !hidden.includes(t.templateId)) : all
  })
  const scenario = computed(() => state.scenario)
  const iterationId = computed(() => state.iterationId)
  const allowNewDashboard = computed(() => getIteration(state.iterationId)?.allowNewDashboard ?? true)
  const allowRemoveDashboard = computed(() => getIteration(state.iterationId)?.allowRemoveDashboard ?? true)
  const allowScenarioToggle = computed(() => getIteration(state.iterationId)?.allowScenarioToggle ?? true)
  const needsChoice = computed(() => state.needsChoice)
  const newDashboardOpen = computed(() => state.newDashboardOpen)

  function getDashboard(id: string): Dashboard | undefined {
    return state.dashboards.find((d) => d.id === id)
  }

  /** The dashboard a report belongs to. */
  function dashboardOf(reportId: string): Dashboard | undefined {
    return state.dashboards.find((d) => d.reports.some((t) => t.id === reportId))
  }

  /** A dashboard's first report that the current iteration doesn't hide. */
  function firstReportOf(dashboardId: string): Report | undefined {
    const d = getDashboard(dashboardId)
    if (!d) return undefined
    const allowed = new Set(reports.value.map((t) => t.id))
    return d.reports.find((t) => allowed.has(t.id))
  }

  /** Route to a dashboard — lands on its first visible report. */
  function dashboardPath(dashboardId: string): string {
    const t = firstReportOf(dashboardId)
    return t ? `/d/${dashboardId}/${t.id}` : '/welcome'
  }

  /** Route to a report — the one place that knows the URL shape. */
  function reportPath(reportId: string): string {
    const d = dashboardOf(reportId)
    return d ? `/d/${d.id}/${reportId}` : '/welcome'
  }

  /**
   * "New dashboard" from the gallery: a private user dashboard holding one report copied
   * from the template. Returns the report (the caller navigates to it). An optional `name`
   * lets the picker use a user-typed name; names are de-duplicated either way.
   */
  function createFromTemplate(templateId: string, name?: string): Report | undefined {
    // Enforced here, not only in the sidebar's v-if: a UI-only guard is bypassed by the
    // next caller.
    if (!allowNewDashboard.value) return undefined
    const t = getTemplate(templateId)
    const d = buildDashboard(name?.trim() || t?.name || templateId, [templateId])
    state.dashboards.push(d)
    return d.reports[0]
  }

  /** Write the working filters onto a dashboard. Every dashboard is the user's now, so
   *  there is nothing left to refuse. */
  function saveScope(dashboardId: string, scope: SavedScope) {
    const d = getDashboard(dashboardId)
    if (!d) return
    d.scope = scope
  }

  /** Remove a whole dashboard. Gated in the composable, not only in the sidebar. */
  function removeDashboard(id: string) {
    if (!allowRemoveDashboard.value) return
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
   *  - 'new'   → seeded from the recommended set
   *  - 'old'   → the legacy reports, rebuilt as one dashboard
   *  - 'later' → nothing (generic empty state)
   * Returns the first report so the caller can navigate.
   * ⚠️ Still REPLACES the list, so "keep my current reports" discards the seeded
   * dashboard — which contradicts this step's own "nothing is lost" promise. Fixed when
   * onboarding is rewired (commit D), once the recommended set is permanently offered in
   * the New dashboard dialog.
   */
  function chooseStart(kind: 'new' | 'old' | 'later'): Report | undefined {
    state.dashboards = []
    if (kind === 'new') state.dashboards.push(buildDashboard(SEED_NAME, QUESTION_LED_TEMPLATE_IDS))
    else if (kind === 'old')
      state.dashboards.push(buildDashboard('My reports', LEGACY_REPORT_TEMPLATE_IDS))
    state.needsChoice = false
    return allReports()[0]
  }

  const openNewDashboard = () => (state.newDashboardOpen = true)
  const closeNewDashboard = () => (state.newDashboardOpen = false)

  return {
    dashboards,
    reports,
    scenario,
    iterationId,
    allowNewDashboard,
    allowRemoveDashboard,
    allowScenarioToggle,
    needsChoice,
    newDashboardOpen,
    getDashboard,
    dashboardOf,
    firstReportOf,
    dashboardPath,
    reportPath,
    saveScope,
    removeDashboard,
    createFromTemplate,
    setScenario,
    setIteration,
    chooseStart,
    openNewDashboard,
    closeNewDashboard,
  }
}
