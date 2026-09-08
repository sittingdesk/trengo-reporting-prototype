<script setup lang="ts">
// FilterChip — the shared trigger for every dashboard filter.
//
// One home for the chip's shape and its states. The three filters each carried the same
// ~200-character class string, copy-pasted; that is how they would have drifted the moment
// an active state landed.
//
// `active` means this filter is NARROWING the view — the same rule the sidebar's scope
// subtitle uses. Only a filter that actually excludes something earns the emphasis, so
// "All channels" stays quiet while "8 channels" doesn't.
//
// The inactive surface is FIELD_SURFACE, shared with the Button's `field` variant — so
// the secondary buttons beside these chips (Edit, the ⋯ menu) can't drift away from
// them. Only the radius differs there: buttons stay `pill`.
//
// `iconOnly` drops the label when the bar is too narrow to afford it. Reports are
// navigation and filters are refinement, so the filters are what gives way. It needs more
// than hiding text: the label is an unnamed slot sitting between two gaps, so an empty
// slot would leave 16px of dead space, and the chip has no accessible name of its own —
// hence `label` / `value` feeding aria-label and title.
import Icon from '@/components/Icon.vue'
import { FIELD_SURFACE } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    icon: string
    active?: boolean
    /** Collapse to icon + caret. Requires `label` to stay accessible. */
    iconOnly?: boolean
    /** What this control is ("Channels", "Team") — the accessible name when collapsed. */
    label?: string
    /** What it currently reads ("8 channels") — announced and shown on hover collapsed. */
    value?: string
  }>(),
  { active: false, iconOnly: false },
)

/** "Channels: 8 channels" — the name AND the value, since neither shows when collapsed.
 *  When the value IS the label (an unfiltered SelectFilter reads "Team"), don't say it
 *  twice. */
const describe = () => {
  const { label, value } = props
  if (!label) return value || undefined
  return !value || value === label ? label : `${label}: ${value}`
}
</script>

<template>
  <button
    type="button"
    :aria-label="iconOnly ? describe() : undefined"
    :title="iconOnly ? describe() : undefined"
    class="inline-flex h-8 items-center rounded-base px-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :class="[
      iconOnly ? 'gap-0.5' : 'gap-2',
      active
        ? 'border border-leaf-300 bg-leaf-100 text-leaf-600 shadow-100 hover:border-leaf-400 data-[state=open]:border-leaf-400'
        : FIELD_SURFACE,
    ]"
  >
    <!-- Both icons inherit the chip's colour, which is what makes the active state a
         one-line change rather than three. Height is stated (h-8, the 32px SM control
         size) rather than derived from padding — see the note in button/index.ts. -->
    <span class="flex shrink-0 p-0.5">
      <Icon :name="icon" :size="20" />
    </span>
    <span v-if="!iconOnly" class="truncate"><slot /></span>
    <Icon name="ChevronDown" :size="16" aria-hidden="true" />
  </button>
</template>
