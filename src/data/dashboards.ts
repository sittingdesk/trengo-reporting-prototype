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
// TRENGO is always there and can't be touched: not renamed, not removed, and its saved
// scope can't be written. It's the reference copy every workspace has.
//
// Everything else is the user's, and the way to get an editable version of Trengo is to
// create your own from the "Trengo recommended" starting set. That copy is a SNAPSHOT —
// later template improvements don't flow into it — while the Trengo dashboard itself is
// rebuilt from the templates on every load, so it always reflects the current definitions.
// `Report.templateId` records provenance either way.
//
// ⚠️ Mock: there is no backend, so nothing survives a reload.
import { getTemplate, type Widget } from '@/config/templates'
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

export type Visibility = 'private' | 'team'

export interface Dashboard {
  id: string
  name: string
  owner: string
  visibility: Visibility
  /** Only when `visibility === 'team'`. */
  teamId?: string
  scope: SavedScope
  reports: Report[]
  /** True only for the Trengo dashboard. Blocks rename, remove and save-scope, and hides
   *  the affordances for all three — the copy route is New dashboard → Trengo
   *  recommended. One flag rather than a second `visibility` state: the owner line reads
   *  off this too. */
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

/** A report with no widgets — what "Start from scratch" produces, and what a blank
 *  report added to an existing dashboard will be. */
export function blankReport(id: string, name = 'Untitled report'): Report {
  return { id, name, widgets: [] }
}

/** The reference dashboard every workspace has. Name doubles as its slug id ("trengo"). */
export const TRENGO_DASHBOARD_NAME = 'Trengo'
export const TRENGO_OWNER = 'Trengo'

/** URL-safe id from a display name. Ids are part of the URL, so a slug keeps deep links
 *  readable ("/d/trengo/overview") and stable across reloads, which also means an HMR
 *  patch doesn't lose your place while developing. */
export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'dashboard'
  )
}
