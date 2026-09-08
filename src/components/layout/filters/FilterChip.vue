<script setup lang="ts">
// FilterChip — the shared trigger for every dashboard filter.
//
// One home for the chip's shape and its two states. The three filters each carried the
// same ~200-character class string, copy-pasted; that is how they would have drifted the
// moment the active state landed.
//
// `active` means this filter is NARROWING the view — the same rule the sidebar's scope
// subtitle uses. Only a filter that actually excludes something earns the emphasis, so
// "All channels" stays quiet while "8 channels" doesn't.
import Icon from '@/components/Icon.vue'

withDefaults(defineProps<{ icon: string; active?: boolean }>(), { active: false })
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-base border px-2 py-1 text-sm font-medium shadow-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    :class="
      active
        ? 'border-leaf-300 bg-leaf-100 text-leaf-600 hover:border-leaf-400 data-[state=open]:border-leaf-400'
        : 'border-grey-400 bg-white text-grey-800 hover:bg-grey-100 data-[state=open]:bg-grey-100'
    "
  >
    <!-- Both icons inherit the chip's colour, which is what makes the active state a
         one-line change rather than three. The 2px box around the leading icon is what
         makes a chip exactly as tall as a report pill: 4 + 24 + 4 + 2 border = 34px,
         matching the pill's 6 + 20 + 6 + 2. -->
    <span class="flex shrink-0 p-0.5">
      <Icon :name="icon" :size="20" />
    </span>
    <slot />
    <!-- 16 rather than the design's 20: our ChevronDown is a FILLED glyph where the
         design uses an outline caret, so matching the box size would out-weigh it. -->
    <Icon name="ChevronDown" :size="16" />
  </button>
</template>
