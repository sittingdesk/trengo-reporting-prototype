// useFilters — the global filter state (channel / team / date range).
//
// Module-level reactive singleton, mirroring useWorkspace. The top-bar filters
// read and write this.
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
import { DATE_PRESETS } from '@/data/filters'

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
  channelIds: [] as string[], // empty = all channels
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

  const toggleChannel = (id: string) => (state.channelIds = toggleId(state.channelIds, id))
  const toggleTeam = (id: string) => (state.teamIds = toggleId(state.teamIds, id))
  const clearChannels = () => (state.channelIds = [])
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
    toggleChannel,
    toggleTeam,
    clearChannels,
    clearTeams,
    setPreset,
    setRange,
  }
}
