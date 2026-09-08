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
import { getIteration, DEFAULT_ITERATION_ID } from '@/config/iterations'
import {
  getStartingSet,
  SEED_SET_ID,
  type StartingSetId,
} from '@/config/startingSets'
import {
  blankReport,
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

/**
 * Build a dashboard from a starting set — an ordinary user dashboard, whatever it started
 * from. Reports take their template id as their own id, so deep links read well and stay
 * stable for anything seeded (see `slugify`).
 *
 * The iteration's `hiddenTemplateIds` is applied HERE rather than when rendering. Hiding
 * at render time meant a report could vanish the instant a user added it, and a dashboard
 * could reach zero visible reports — whose own sidebar row then navigated away from it.
 * The flag means "which templates this rollout offers", so creation is where it belongs.
 */
function buildDashboard(setId: StartingSetId, name?: string): Dashboard {
  const set = getStartingSet(setId)
  const hidden = getIteration(state.iterationId)?.hiddenTemplateIds ?? []
  const templateIds = (set?.templateIds ?? []).filter((t) => !hidden.includes(t))
  const label = name?.trim() || set?.defaultName || 'My dashboard'
  const reportIds = new Set<string>()
  const takeId = (base: string) => {
    const id = uniqueId(base, reportIds)
    reportIds.add(id)
    return id
  }
  return {
    id: uniqueId(slugify(label), new Set(state.dashboards.map((d) => d.id))),
    name: uniqueName(label, state.dashboards.map((d) => d.name)),
    owner: DEMO_USER,
    visibility: 'private',
    scope: { ...DEFAULT_SCOPE },
    // An empty set — or one whose every template this rollout hides — still gives you a
    // dashboard you can work in, rather than an unreachable empty one.
    reports: templateIds.length
      ? templateIds.map((t) => reportFromTemplate(t, takeId(t)))
      : [blankReport(takeId('report'))],
  }
}

/** Apply a scenario's starting state: new → seeded from the recommended set;
 *  existing → ask first. */
function applyScenario(scenario: Scenario) {
  state.dashboards = []
  if (scenario === 'new') {
    state.dashboards.push(buildDashboard(SEED_SET_ID))
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

  // Every report, flat. No filtering: the iteration's hidden templates are applied when
  // a dashboard is BUILT (see buildDashboard), so what exists is what shows.
  const reports = computed(() => allReports())
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

  /** A dashboard's first report. */
  function firstReportOf(dashboardId: string): Report | undefined {
    return getDashboard(dashboardId)?.reports[0]
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
   * "New dashboard": a private dashboard from a starting set, with an optional user-typed
   * name (de-duplicated either way). Returns its first report so the caller can navigate.
   */
  function createDashboard(setId: StartingSetId, name?: string): Report | undefined {
    // Enforced here, not only in the sidebar's v-if: a UI-only guard is bypassed by the
    // next caller.
    if (!allowNewDashboard.value) return undefined
    const d = buildDashboard(setId, name)
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

  /** Rename a dashboard. Its id — and so its URL — is deliberately UNCHANGED: an id that
   *  tracked the name would break every saved link the moment someone renamed. */
  function renameDashboard(id: string, name: string) {
    const d = getDashboard(id)
    const next = name.trim()
    if (!d || !next) return
    d.name = uniqueName(
      next,
      state.dashboards.filter((x) => x.id !== id).map((x) => x.name),
    )
  }

  /** Remove a whole dashboard. Gated in the composable, not only in the sidebar. */
  function removeDashboard(id: string) {
    if (!allowRemoveDashboard.value) return
    state.dashboards = state.dashboards.filter((x) => x.id !== id)
  }

  /**
   * Put the workspace back to its first-load state for the active scenario — prototype
   * only. Dashboards can be created and removed now and nothing persists, so a demo
   * needs one click back to the starting point instead of rebuilding it by hand.
   * Returns the first report so the caller can navigate.
   */
  function resetPrototype(): Report | undefined {
    applyScenario(state.scenario)
    return allReports()[0]
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
   *
   * It replaces the list, which is safe: this step is only reachable when the workspace
   * is empty (the 'existing' scenario seeds nothing and asks first). And nothing is lost
   * either way — both sets are permanent options in the New dashboard dialog, so the
   * choice is a starting point rather than a commitment.
   */
  function chooseStart(kind: 'new' | 'old' | 'later'): Report | undefined {
    state.dashboards = []
    if (kind === 'new') state.dashboards.push(buildDashboard('recommended'))
    else if (kind === 'old') state.dashboards.push(buildDashboard('current-reports'))
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
    renameDashboard,
    removeDashboard,
    createDashboard,
    resetPrototype,
    setScenario,
    setIteration,
    chooseStart,
    openNewDashboard,
    closeNewDashboard,
  }
}
