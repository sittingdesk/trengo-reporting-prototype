<script setup lang="ts">
// Tooltip — a self-contained styled hover tooltip (reka-ui based).
// Usage: <Tooltip text="Description…"><span>trigger</span></Tooltip>
// Styling per design.md: dark (grey-900) surface, white 12px medium text.
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipArrow,
} from 'reka-ui'

defineProps<{ text?: string }>()
</script>

<template>
  <TooltipProvider :delay-duration="150">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <slot />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent
          :side-offset="6"
          class="z-50 max-w-xs rounded-base bg-grey-800 px-2.5 py-1.5 text-xs font-medium leading-relaxed text-white shadow-300 data-[state=delayed-open]:animate-in data-[state=closed]:animate-out"
        >
          {{ text }}
          <TooltipArrow class="fill-grey-800" :width="10" :height="5" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
