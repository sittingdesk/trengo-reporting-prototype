// usePrototypeSettings — prototype-only display flags (not product behaviour).
//
// `showComparison` toggles the period-over-period delta (▲▼) on metric cards.
// Per TECH_FOUNDATION §8 comparison is a later phase, so it's off by default and
// surfaced only as a prototype switch for demos.
// `showEmptyData` simulates "no events in the selected range" so the empty
// states can be demoed on demand (counts still show a true 0 — zero is a value).
import { ref, computed } from 'vue'

const state = ref({ showComparison: false, showEmptyData: false })

export function useSettings() {
  const showComparison = computed(() => state.value.showComparison)
  const toggleComparison = () => (state.value.showComparison = !state.value.showComparison)
  const setComparison = (on: boolean) => (state.value.showComparison = on)

  const showEmptyData = computed(() => state.value.showEmptyData)
  const toggleEmptyData = () => (state.value.showEmptyData = !state.value.showEmptyData)

  return { showComparison, toggleComparison, setComparison, showEmptyData, toggleEmptyData }
}
