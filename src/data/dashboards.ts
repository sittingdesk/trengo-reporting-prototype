// Dashboards — the layer above tabs.
//
//   Dashboard → Tab → Widget
//
// A dashboard has a name, an owner, a visibility, a SAVED filter scope and an ordered
// list of tabs. A tab has a name and an ordered list of widgets — the metric cards that
// already exist. Widgets are OWNED by the tab, copied from a template at creation: a
// template is a starting point, not a live link. That is what lets a tab be blank, or a
// copy of another tab that then diverges. (The old model resolved a tab's template live,
// which can express neither.)
//
// ⚠️ Mock: there is no backend. The Trengo default is rebuilt from the templates on every
// load so template edits keep flowing into it; user dashboards are snapshots.
import { getTemplate, QUESTION_LED_TEMPLATE_IDS, type Widget } from '@/config/templates'

/** Date presets a scope may store. A preset re-resolves every day, so a saved scope can
 *  never go stale — which is why a scope stores a preset id and never two dates. */
export type DatePresetId =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'month'
  | 'lastMonth'
  | 'last3months'
  | 'lastYear'
  | 'quarter'

/** The filters a dashboard opens with. Empty `channelIds` / `teamIds` mean "all". */
export interface SavedScope {
  presetId: DatePresetId
  channelIds: string[]
  teamIds: string[]
}

export interface DashboardTab {
  id: string
  name: string
  /** Owned by the tab (see header comment). */
  widgets: Widget[]
  /** Provenance only: which template this tab started from. Drives the iteration
   *  picker's page hiding and the "Copy of …" label — never used to resolve widgets. */
  templateId?: string
}

/** `everyone` is the Trengo default: shared with the whole workspace, which is neither
 *  "private" nor "shared with a team". */
export type Visibility = 'private' | 'team' | 'everyone'

export interface Dashboard {
  id: string
  name: string
  owner: string
  visibility: Visibility
  /** Only when `visibility === 'team'`. */
  teamId?: string
  scope: SavedScope
  tabs: DashboardTab[]
  /** The Trengo default can't be edited — adding a tab offers to duplicate it first. */
  readonly: boolean
}

export const TRENGO_DASHBOARD_ID = 'trengo'
export const TRENGO_OWNER = 'Trengo'

/** What every new dashboard opens with until its owner saves something else. */
export const DEFAULT_SCOPE: SavedScope = { presetId: 'last7', channelIds: [], teamIds: [] }

/** A tab whose widgets are a fresh copy of a template's. */
export function tabFromTemplate(templateId: string, id: string, name?: string): DashboardTab {
  const t = getTemplate(templateId)
  return {
    id,
    name: name ?? t?.name ?? templateId,
    widgets: (t?.widgets ?? []).map((w) => ({ ...w })),
    templateId,
  }
}

/**
 * The default dashboard: the five question-led pages, unchanged in content and order.
 * Built fresh from the templates on every call — never persisted — so it always reflects
 * the current template definitions.
 */
export function buildTrengoDashboard(): Dashboard {
  return {
    id: TRENGO_DASHBOARD_ID,
    name: 'Trengo',
    owner: TRENGO_OWNER,
    visibility: 'everyone',
    scope: { ...DEFAULT_SCOPE },
    tabs: QUESTION_LED_TEMPLATE_IDS.map((templateId) =>
      tabFromTemplate(templateId, `${TRENGO_DASHBOARD_ID}-${templateId}`),
    ),
    readonly: true,
  }
}
