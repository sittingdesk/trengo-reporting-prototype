// Dashboards — the layer above reports.
//
//   Dashboard → Report → Widget
//
// A dashboard has a name, an owner, a visibility, a SAVED filter scope and an ordered
// list of reports. A report has a name and an ordered list of widgets — the metric cards that
// already exist. Widgets are OWNED by the report, copied from a template at creation: a
// template is a starting point, not a live link. That is what lets a report be blank, or a
// copy of another report that then diverges. (The old model resolved a report's template live,
// which can express neither.)
//
// ⚠️ Mock: there is no backend. The Trengo default is rebuilt from the templates on every
// load so template edits keep flowing into it; user dashboards are snapshots.
import { getTemplate, QUESTION_LED_TEMPLATE_IDS, type Widget } from '@/config/templates'
import { DATE_PRESETS, TEAMS } from '@/data/filters'
import { CHANNEL_INSTANCE_IDS } from '@/data/channelData'

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

export interface Report {
  id: string
  name: string
  /** Owned by the report (see header comment). */
  widgets: Widget[]
  /** Provenance only: which template this report started from. Drives the iteration
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
  reports: Report[]
  /** The Trengo default can't be edited — adding a report offers to duplicate it first. */
  readonly: boolean
}

/** Human-readable saved scope for the sidebar subtitle — "Last 7 days", or
 *  "Last 30 days · 2 channels" when something is actually narrowed.
 *
 *  Only mentions filters that NARROW the view. "Last 7 days · All channels · All teams"
 *  truncates in a 240px sidebar and spends its width on the two words that carry no
 *  information; the date is the part that always matters. */
export function scopeLabel(scope: SavedScope): string {
  const parts = [DATE_PRESETS.find((p) => p.id === scope.presetId)?.label ?? 'Custom range']
  // Empty means "all"; so does a full selection, since that's how useFilters starts out.
  const nCh = scope.channelIds.length
  const nTm = scope.teamIds.length
  if (nCh > 0 && nCh < CHANNEL_INSTANCE_IDS.length) {
    parts.push(`${nCh} ${nCh === 1 ? 'channel' : 'channels'}`)
  }
  if (nTm > 0 && nTm < TEAMS.length) parts.push(`${nTm} ${nTm === 1 ? 'team' : 'teams'}`)
  return parts.join(' · ')
}

export const TRENGO_DASHBOARD_ID = 'trengo'
export const TRENGO_OWNER = 'Trengo'

/** What every new dashboard opens with until its owner saves something else. */
export const DEFAULT_SCOPE: SavedScope = { presetId: 'last7', channelIds: [], teamIds: [] }

/** A report whose widgets are a fresh copy of a template's. */
export function reportFromTemplate(templateId: string, id: string, name?: string): Report {
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
    reports: QUESTION_LED_TEMPLATE_IDS.map((templateId) =>
      reportFromTemplate(templateId, `${TRENGO_DASHBOARD_ID}-${templateId}`),
    ),
    readonly: true,
  }
}
