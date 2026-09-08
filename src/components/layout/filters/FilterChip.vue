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
// `iconOnly` drops the label when the bar is too narrow to afford it. Reports are
// navigation and filters are refinement, so the filters are what gives way. It needs more
// than hiding text: the label is an unnamed slot sitting between two gaps, so an empty
// slot would leave 16px of dead space, and the chip has no accessible name of its own —
// hence `label` / `value` feeding aria-label and title.
import Icon from '@/components/Icon.vue'

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
    class="inline-flex items-center rounded-base border px-2 py-1 text-sm font-medium shadow-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :class="[
      iconOnly ? 'gap-0.5' : 'gap-2',
      active
        ? 'border-leaf-300 bg-leaf-100 text-leaf-600 hover:border-leaf-400 data-[state=open]:border-leaf-400'
        : 'border-grey-400 bg-white text-grey-800 hover:bg-grey-100 data-[state=open]:bg-grey-100',
    ]"
  >
    <!-- Both icons inherit the chip's colour, which is what makes the active state a
         one-line change rather than three. The 2px box around the leading icon is what
         makes a chip exactly as tall as a report pill: 4 + 24 + 4 + 2 border = 34px,
         matching the pill's 6 + 20 + 6 + 2. -->
    <span class="flex shrink-0 p-0.5">
      <Icon :name="icon" :size="20" />
    </span>
    <span v-if="!iconOnly" class="truncate"><slot /></span>
    <Icon name="ChevronDown" :size="16" aria-hidden="true" />
  </button>
</template>
