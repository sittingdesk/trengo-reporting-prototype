<script setup lang="ts">
// DialogContent — the centered panel + dimmed overlay, with a close (X) button.
// Teleported to <body> via DialogPortal so it sits above everything.
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<DialogContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<DialogContentEmits>()

// Pass reka-ui props through, but keep our own `class` out of the forwarded set.
const forwarded = useForwardPropsEmits(
  () => {
    const { class: _ignored, ...rest } = props
    return rest
  },
  emits,
)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-grey-900/40 data-[state=open]:animate-in data-[state=closed]:animate-out"
    />
    <DialogContent
      v-bind="forwarded"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-grey-300 bg-white p-6 shadow-500 focus:outline-none',
          props.class,
        )
      "
    >
      <slot />
      <DialogClose
        class="absolute right-4 top-4 flex size-8 items-center justify-center rounded-base text-grey-600 transition-colors hover:bg-grey-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Close"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
