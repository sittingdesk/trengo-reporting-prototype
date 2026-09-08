// Prototype-only "iterations" — feature-flag sets used to demo different rollout
// states from the prototype scenario panel. Each iteration controls which pages
// (templates) are visible and whether new dashboards can be created.
export interface Iteration {
  id: string
  label: string
  /** Template ids hidden in this iteration (pages removed from the report list). */
  hiddenTemplateIds: string[]
  /** Whether the "New dashboard" triggers are available. */
  allowNewDashboard: boolean
  /** Whether pages can be removed (the per-dashboard remove control). */
  allowRemoveDashboard: boolean
  /** Whether the prototype scenario (existing/new customer) can be toggled. */
  allowScenarioToggle: boolean
  /** Temporarily hidden from the iteration picker (kept in code to unlock later). */
  disabled?: boolean
}

export const ITERATIONS: Iteration[] = [
  {
    id: 'full',
    label: 'Full build',
    hiddenTemplateIds: [],
    allowNewDashboard: true,
    allowRemoveDashboard: true,
    allowScenarioToggle: true,
    disabled: true, // locked for now — unlock later
  },
  {
    id: 'internal-test',
    label: 'Internal Testing + Selective Test Group',
    // A locked-down test build: seeded with the recommended set, no scenario choice.
    // Creating and removing dashboards IS allowed — that layer is what's being tested.
    hiddenTemplateIds: [],
    allowNewDashboard: true,
    // Was belt-and-braces while the default dashboard was read-only anyway. Now it is
    // the only way to clean up, including the seeded dashboard.
    allowRemoveDashboard: true,
    allowScenarioToggle: false,
  },
]

export function getIteration(id: string): Iteration | undefined {
  return ITERATIONS.find((i) => i.id === id)
}

/** Iterations offered in the picker (disabled ones are hidden but stay resolvable). */
export const SELECTABLE_ITERATIONS = ITERATIONS.filter((i) => !i.disabled)

/** Default iteration — first selectable one. */
export const DEFAULT_ITERATION_ID = SELECTABLE_ITERATIONS[0]?.id ?? ITERATIONS[0].id
