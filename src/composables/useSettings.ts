// usePrototypeSettings — prototype-only display flags (not product behaviour).
//
// Comparison (the period-over-period delta) is no longer a switch — every card shows it
// always. It stopped being a demo feature once the delta earned its place: bands mean a
// small move now reads as neutral instead of an alarm, so there's nothing to opt out of.
// `dataState` is a demo VIEWING MODE that forces every card into one state so the
// three data situations can be reviewed on demand:
//   normal  — real (mock) data
//   loading — hold the loading skeleton (otherwise it only flashes ~350ms)
//   empty   — simulate "no events in range" (counts still show a true 0)
// `slaEnabled` simulates a workspace that has SLA policies configured. SLA is a
// capability a customer switches on, so metrics that only exist once there's a
// policy are hidden until it is — see `requires` in src/data/metrics.ts.
// `humanOnlyView` is a DESIGN switch, not a data one: it flips between the two patterns
// under consideration for the All / Human only pair on First response time and Resolution
// time, so they can be compared on the real page at real widths. Both show ONE number at
// a time — a third pattern that printed both figures ("Show both") was rejected as
// confusing (Jeff, 2026-10-05).
//   toggle — the view is chosen from the card's ⋯ menu, active view named beside the number
//   inline — the name beside the number IS the control: "All tickets ⌄" opens the choice
import { ref, computed } from 'vue'

export type DataState = 'normal' | 'loading' | 'empty' | 'error'
export type HumanOnlyView = 'toggle' | 'inline'

// 'inline' by default: it keeps Menu toggle's model (one number, switchable) and fixes
// where the switch lives. Menu toggle stays one click away for comparison.
export const DEFAULT_HUMAN_ONLY_VIEW: HumanOnlyView = 'inline'

const state = ref({
  dataState: 'normal' as DataState,
  slaEnabled: false,
  humanOnlyView: DEFAULT_HUMAN_ONLY_VIEW as HumanOnlyView,
  // The beta heads-up modal (ReleaseIntroDialog). Prototype-only trigger: in production it
  // opens once per user on their first visit after joining the beta.
  releaseIntroOpen: false,
})

export function useSettings() {
  // SLA — a FEATURE flag, not a display flag: it changes which widgets a page has,
  // where comparison/data-state only change how existing ones look. Its sidebar switch was
  // removed (2026-10-05), so it stays off: the SLA cards and the channel table's SLA column
  // are parked, not deleted — flip the default above to bring them back.
  const slaEnabled = computed(() => state.value.slaEnabled)
  const toggleSla = () => (state.value.slaEnabled = !state.value.slaEnabled)
  const setSla = (on: boolean) => (state.value.slaEnabled = on)

  const dataState = computed(() => state.value.dataState)
  const setDataState = (s: DataState) => (state.value.dataState = s)
  // Derived flags the cards read (keeps MetricBox's call sites simple).
  const showEmptyData = computed(() => state.value.dataState === 'empty')
  const forceLoading = computed(() => state.value.dataState === 'loading')
  const forceError = computed(() => state.value.dataState === 'error')

  const humanOnlyView = computed(() => state.value.humanOnlyView)
  const setHumanOnlyView = (v: HumanOnlyView) => (state.value.humanOnlyView = v)

  const releaseIntroOpen = computed(() => state.value.releaseIntroOpen)
  const openReleaseIntro = () => (state.value.releaseIntroOpen = true)
  const closeReleaseIntro = () => (state.value.releaseIntroOpen = false)

  return {
    releaseIntroOpen,
    openReleaseIntro,
    closeReleaseIntro,
    humanOnlyView,
    setHumanOnlyView,
    slaEnabled,
    toggleSla,
    setSla,
    dataState,
    setDataState,
    showEmptyData,
    forceLoading,
    forceError,
  }
}
