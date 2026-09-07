// useFilters — the WORKING filter state (channel / team / date range).
//
// Module-level reactive singleton, mirroring useWorkspace. The dashboard header's
// filters read and write this.
//
// A dashboard owns a SAVED scope; this is the working copy. Opening a dashboard calls
// `applyScope`, and from then on the two can diverge — which is what step 9's "Filters
// changed" marker reports. `currentScope()` reads the working state back out in savable
// form, and normalises "everything selected" to an empty array so a saved scope has one
// canonical shape.
//
// ⚠️ Visual only: nothing actually filters data yet. The date range can be set
// from a preset (Last 7 days, This month, …) or by picking start/end on the
// calendar. Presets + the calendar are anchored to a fixed prototype "today"
// (2026-06-23) so the demo lines up with the mock data — swap TODAY for
// `today(getLocalTimeZone())` for a real build.
import { reactive, computed, shallowRef, ref } from 'vue'
import {
  CalendarDate,
  startOfMonth,
  endOfMonth,
  getLocalTimeZone,
  type DateValue,
} from '@internationalized/date'
import { DATE_PRESETS, TEAMS } from '@/data/filters'
import { CHANNEL_INSTANCE_IDS } from '@/data/channelData'
import type { SavedScope, DatePresetId } from '@/data/dashboards'

export interface DateRange {
  start: DateValue | undefined
  end: DateValue | undefined
}

/** Prototype "today" — keeps the calendar on June 2026 to match the mock data. */
const TODAY = new CalendarDate(2026, 6, 23)

/** Concrete {start,end} for a preset id. */
function presetRange(id: string): DateRange {
  switch (id) {
    case 'today':
      return { start: TODAY, end: TODAY }
    case 'yesterday': {
      const y = TODAY.subtract({ days: 1 })
      return { start: y, end: y }
    }
    case 'last7':
      return { start: TODAY.subtract({ days: 6 }), end: TODAY }
    case 'last30':
      return { start: TODAY.subtract({ days: 29 }), end: TODAY }
    case 'month':
      return { start: startOfMonth(TODAY), end: TODAY }
    case 'lastMonth': {
      const lm = TODAY.subtract({ months: 1 })
      return { start: startOfMonth(lm), end: endOfMonth(lm) }
    }
    case 'last3months':
      return { start: TODAY.subtract({ months: 3 }), end: TODAY }
    case 'lastYear':
      return { start: TODAY.subtract({ years: 1 }), end: TODAY }
    default:
      return { start: TODAY.subtract({ days: 6 }), end: TODAY }
  }
}

/** If a range exactly matches a preset, return that preset id (else null). */
function matchPreset(r: DateRange): string | null {
  if (!r.start || !r.end) return null
  for (const p of DATE_PRESETS) {
    const pr = presetRange(p.id)
    if (pr.start && pr.end && pr.start.compare(r.start) === 0 && pr.end.compare(r.end) === 0) {
      return p.id
    }
  }
  return null
}

const state = reactive({
  // Channel selection = explicit instance ids; defaults to ALL (= no filter).
  channelIds: [...CHANNEL_INSTANCE_IDS] as string[],
  teamIds: [] as string[], // empty = all teams
})

// Date range lives outside `reactive` (immutable DateValue objects, swapped wholesale).
const dateRange = shallowRef<DateRange>(presetRange('last7'))
const presetId = ref<string | null>('last7')

const tz = getLocalTimeZone()
const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
function formatRange(r: DateRange): string {
  if (!r.start) return 'Date range'
  const s = dayFmt.format(r.start.toDate(tz))
  if (!r.end || r.end.compare(r.start) === 0) return s
  return `${s} – ${dayFmt.format(r.end.toDate(tz))}`
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

// Comparison phrasing per preset (the delta's "vs …" label).
const COMPARISON_LABEL: Record<string, string> = {
  today: 'vs yesterday',
  yesterday: 'vs prev. day',
  last7: 'vs prev. 7 days',
  last30: 'vs prev. 30 days',
  month: 'vs last month',
  lastMonth: 'vs prev. month',
  last3months: 'vs prev. 3 months',
  lastYear: 'vs prev. year',
}

export function useFilters() {
  const channelIds = computed(() => state.channelIds)
  const teamIds = computed(() => state.teamIds)

  const dateRangeLabel = computed(() =>
    presetId.value
      ? (DATE_PRESETS.find((p) => p.id === presetId.value)?.label ?? formatRange(dateRange.value))
      : formatRange(dateRange.value),
  )

  // Delta comparison label — preset phrasing, or a same-length window for a custom range.
  const comparisonLabel = computed(() => {
    if (presetId.value && COMPARISON_LABEL[presetId.value]) return COMPARISON_LABEL[presetId.value]
    const { start, end } = dateRange.value
    if (!start || !end) return 'vs prev. period'
    const n = Math.max(
      1,
      Math.round((end.toDate(tz).getTime() - start.toDate(tz).getTime()) / 86_400_000) + 1,
    )
    return `vs prev. ${n} ${n === 1 ? 'day' : 'days'}`
  })

  /** Apply a dashboard's saved scope — called when one opens. An empty list in the
   *  scope means "all", which the working state represents as every id selected. */
  function applyScope(scope: SavedScope) {
    state.channelIds = scope.channelIds.length ? [...scope.channelIds] : [...CHANNEL_INSTANCE_IDS]
    state.teamIds = scope.teamIds.length === TEAMS.length ? [] : [...scope.teamIds]
    setPreset(scope.presetId)
  }

  /** The working state as a savable scope. Normalised: "everything" is stored as an
   *  empty list, never as a full one, so two equivalent scopes compare equal. */
  function currentScope(): SavedScope {
    return {
      presetId: (presetId.value ?? 'last7') as DatePresetId,
      channelIds:
        state.channelIds.length === CHANNEL_INSTANCE_IDS.length ? [] : [...state.channelIds],
      teamIds: state.teamIds.length === TEAMS.length ? [] : [...state.teamIds],
    }
  }

  const setChannels = (ids: string[]) => (state.channelIds = ids)
  const toggleTeam = (id: string) => (state.teamIds = toggleId(state.teamIds, id))
  const clearTeams = () => (state.teamIds = [])

  /** Pick a named preset (highlights it + jumps the calendar to its range). */
  function setPreset(id: string) {
    presetId.value = id
    dateRange.value = presetRange(id)
  }

  /** Set a range from the calendar; re-highlights a preset if it happens to match. */
  function setRange(r: DateRange | undefined) {
    if (!r) return
    dateRange.value = r
    presetId.value = matchPreset(r)
  }

  return {
    channelIds,
    teamIds,
    dateRange,
    presetId,
    dateRangeLabel,
    comparisonLabel,
    setChannels,
    toggleTeam,
    clearTeams,
    setPreset,
    setRange,
    applyScope,
    currentScope,
  }
}
