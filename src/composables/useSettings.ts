// usePrototypeSettings — prototype-only display flags (not product behaviour).
//
// `showComparison` toggles the period-over-period delta (▲▼) on metric cards.
// Per TECH_FOUNDATION §8 comparison is a later phase, so it's off by default and
// surfaced only as a prototype switch for demos.
// `dataState` is a demo VIEWING MODE that forces every card into one state so the
// three data situations can be reviewed on demand:
//   normal  — real (mock) data
//   loading — hold the loading skeleton (otherwise it only flashes ~350ms)
//   empty   — simulate "no events in range" (counts still show a true 0)
import { ref, computed } from 'vue'

export type DataState = 'normal' | 'loading' | 'empty'

const state = ref({ showComparison: false, dataState: 'normal' as DataState })

export function useSettings() {
  const showComparison = computed(() => state.value.showComparison)
  const toggleComparison = () => (state.value.showComparison = !state.value.showComparison)
  const setComparison = (on: boolean) => (state.value.showComparison = on)

  const dataState = computed(() => state.value.dataState)
  const setDataState = (s: DataState) => (state.value.dataState = s)
  // Derived flags the cards read (keeps MetricBox's call sites simple).
  const showEmptyData = computed(() => state.value.dataState === 'empty')
  const forceLoading = computed(() => state.value.dataState === 'loading')

  return {
    showComparison,
    toggleComparison,
    setComparison,
    dataState,
    setDataState,
    showEmptyData,
    forceLoading,
  }
}
