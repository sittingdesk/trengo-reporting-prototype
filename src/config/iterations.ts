// Prototype-only "iterations" — feature-flag sets used to demo different rollout
// states from the prototype scenario panel. Each iteration controls which pages
// (templates) are visible and whether new dashboards can be created.
export interface Iteration {
  id: string
  label: string
  /** Template ids hidden in this iteration (pages removed from the tab list). */
  hiddenTemplateIds: string[]
  /** Whether the "New dashboard" triggers are available. */
  allowNewDashboard: boolean
  /** Whether pages can be removed (the per-tab remove control). */
  allowRemoveDashboard: boolean
  /** Whether the prototype scenario (existing/new customer) can be toggled. */
  allowScenarioToggle: boolean
}

export const ITERATIONS: Iteration[] = [
  {
    id: 'full',
    label: 'Full build',
    hiddenTemplateIds: [],
    allowNewDashboard: true,
    allowRemoveDashboard: true,
    allowScenarioToggle: true,
  },
  {
    id: 'internal-test',
    label: 'Internal Testing + Selective Test Group',
    // A locked-down test build: only Overview & Operate, the seeded ("filled")
    // dashboard only; no adding/removing pages, no scenario choice.
    hiddenTemplateIds: ['understand', 'improve', 'automate'],
    allowNewDashboard: false,
    allowRemoveDashboard: false,
    allowScenarioToggle: false,
  },
]

export function getIteration(id: string): Iteration | undefined {
  return ITERATIONS.find((i) => i.id === id)
}
