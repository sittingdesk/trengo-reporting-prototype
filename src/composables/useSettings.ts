// usePrototypeSettings — prototype-only display flags (not product behaviour).
//
// `showComparison` toggles the period-over-period delta (▲▼) on metric cards.
// Per TECH_FOUNDATION §8 comparison is a later phase, so it's off by default and
// surfaced only as a prototype switch for demos.
import { ref, computed } from 'vue'

const state = ref({ showComparison: false })

export function useSettings() {
  const showComparison = computed(() => state.value.showComparison)
  const toggleComparison = () => (state.value.showComparison = !state.value.showComparison)
  const setComparison = (on: boolean) => (state.value.showComparison = on)
  return { showComparison, toggleComparison, setComparison }
}
