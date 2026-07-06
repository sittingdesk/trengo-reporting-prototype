<script setup lang="ts">
// shadcn-vue ScrollArea — built on reka-ui's ScrollArea primitives. A custom,
// slim scrollbar over an overflow viewport. Used for the Channel filter's
// instance list when a category has many instances.
import {
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <ScrollAreaRoot :class="cn('relative overflow-hidden', props.class)" style="--reka-scroll-area-corner-height: 0">
    <ScrollAreaViewport class="size-full rounded-[inherit]">
      <slot />
    </ScrollAreaViewport>
    <ScrollAreaScrollbar
      orientation="vertical"
      class="flex touch-none select-none p-0.5 transition-colors"
      style="width: 8px"
    >
      <ScrollAreaThumb class="relative flex-1 rounded-pill bg-grey-300" />
    </ScrollAreaScrollbar>
  </ScrollAreaRoot>
</template>
