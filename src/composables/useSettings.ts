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
import { ref, computed } from 'vue'

export type DataState = 'normal' | 'loading' | 'empty' | 'error'

const state = ref({ dataState: 'normal' as DataState, slaEnabled: false })

export function useSettings() {
  // SLA — a FEATURE flag, not a display flag: it changes which widgets a page has,
  // where comparison/data-state only change how existing ones look.
  const slaEnabled = computed(() => state.value.slaEnabled)
  const toggleSla = () => (state.value.slaEnabled = !state.value.slaEnabled)
  const setSla = (on: boolean) => (state.value.slaEnabled = on)

  const dataState = computed(() => state.value.dataState)
  const setDataState = (s: DataState) => (state.value.dataState = s)
  // Derived flags the cards read (keeps MetricBox's call sites simple).
  const showEmptyData = computed(() => state.value.dataState === 'empty')
  const forceLoading = computed(() => state.value.dataState === 'loading')
  const forceError = computed(() => state.value.dataState === 'error')

  return {
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
