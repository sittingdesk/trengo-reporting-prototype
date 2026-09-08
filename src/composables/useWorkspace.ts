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
import { getTemplate, LEGACY_REPORT_TEMPLATE_IDS } from '@/config/templates'
import { getIteration, DEFAULT_ITERATION_ID } from '@/config/iterations'
import {
  buildTrengoDashboard,
  reportFromTemplate,
  DEFAULT_SCOPE,
  type Dashboard,
  type Report,
  type SavedScope,
} from '@/data/dashboards'


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
  newDashboardOpen: false,
})

let counter = 0
function makeId(prefix: string) {
  counter += 1
  return `${prefix}-${counter}`
}

/** The legacy reports, rebuilt — one user dashboard holding the four old reports. */
function buildLegacyDashboard(): Dashboard {
  return {
    id: makeId('legacy'),
    name: 'My reports',
    owner: DEMO_USER,
    visibility: 'private',
    scope: { ...DEFAULT_SCOPE },
    reports: LEGACY_REPORT_TEMPLATE_IDS.map((t) => reportFromTemplate(t, makeId(t))),
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

function allReports(): Report[] {
  return state.dashboards.flatMap((d) => d.reports)
}

/** Ensure a unique report name ("Voice", "Voice 2", …) WITHIN one dashboard.
 *  Global uniqueness was a holdover from when a report *was* a dashboard: it made a new
 *  dashboard from the Understand template come out as "Understand 2", because Trengo
 *  already had a report by that name. Two dashboards may each have an "Overview". */
function uniqueName(base: string, within: Report[]): string {
  const existing = new Set(within.map((t) => t.name))
  if (!existing.has(base)) return base
  let n = 2
  while (existing.has(`${base} ${n}`)) n += 1
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

  function getReport(id: string): Report | undefined {
    return allReports().find((t) => t.id === id)
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
  function createFromTemplate(templateId: string, name?: string): Report {
    const t = getTemplate(templateId)
    // A brand-new dashboard has no reports, so nothing to de-duplicate against.
    const reportName = uniqueName(name?.trim() || t?.name || templateId, [])
    const report = reportFromTemplate(templateId, makeId(templateId), reportName)
    state.dashboards.push({
      id: makeId('dash'),
      name: reportName,
      owner: DEMO_USER,
      visibility: 'private',
      scope: { ...DEFAULT_SCOPE },
      reports: [report],
      readonly: false,
    })
    return report
  }

  /** Write the working filters onto a dashboard. Refused on the read-only default —
   *  step 14 turns that into an offer to duplicate it first. */
  function saveScope(dashboardId: string, scope: SavedScope) {
    const d = getDashboard(dashboardId)
    if (!d || d.readonly) return
    d.scope = scope
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
   * Returns the first report so the caller can navigate. Non-destructive: every
   * template stays available in the gallery regardless of choice.
   */
  function chooseStart(kind: 'new' | 'old' | 'later'): Report | undefined {
    if (kind === 'new') state.dashboards = [buildTrengoDashboard()]
    else if (kind === 'old') state.dashboards = [buildLegacyDashboard()]
    else state.dashboards = []
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
    getReport,
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
