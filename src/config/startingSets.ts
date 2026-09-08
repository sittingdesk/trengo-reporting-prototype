// The starting sets — what "New dashboard" offers.
//
// A starting set is a named list of REPORT TEMPLATES, used only at creation. It is the
// ONLY dashboard-level choice there is.
//
// This is the line that was previously blurred: a template is report-shaped, so the nine
// individual templates belong in "Add report", not here. Offering them as dashboards is
// what produced a dashboard named Overview containing one report named Overview — the same
// thing at two grains. Here you pick which SET of reports you start with; "Start from
// scratch" is simply the empty set.
//
// A created dashboard is a snapshot: later template improvements do not flow into it.
// `Report.templateId` records the provenance, so an opt-in "this report has an update"
// stays possible.
import { LEGACY_REPORT_TEMPLATE_IDS, QUESTION_LED_TEMPLATE_IDS } from '@/config/templates'

export type StartingSetId = 'scratch' | 'recommended' | 'current-reports'

export interface StartingSet {
  id: StartingSetId
  name: string
  description: string
  /** Report templates to instantiate, in order. Empty = a single blank report. */
  templateIds: string[]
  /** Prefills the dialog's name field; the user can always type over it. */
  defaultName: string
  /** Surfaces first and shows a "Recommended" badge. */
  recommended?: boolean
}

export const STARTING_SETS: StartingSet[] = [
  {
    id: 'recommended',
    name: 'Trengo recommended',
    description: 'Five reports built around the questions teams ask most.',
    templateIds: [...QUESTION_LED_TEMPLATE_IDS],
    defaultName: 'My dashboard',
    recommended: true,
  },
  {
    id: 'current-reports',
    name: 'My current reports',
    description: 'Your familiar reports, rebuilt in the new system.',
    templateIds: [...LEGACY_REPORT_TEMPLATE_IDS],
    defaultName: 'My reports',
  },
  {
    id: 'scratch',
    name: 'Start from scratch',
    description: 'One empty report. Add the widgets you want.',
    templateIds: [],
    defaultName: 'My dashboard',
  },
]

/** The set a new workspace is seeded with, so the app never opens empty. */
export const SEED_SET_ID: StartingSetId = 'recommended'

export function getStartingSet(id: string): StartingSet | undefined {
  return STARTING_SETS.find((s) => s.id === id)
}
