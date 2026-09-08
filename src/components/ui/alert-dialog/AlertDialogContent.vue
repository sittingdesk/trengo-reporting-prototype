<script setup lang="ts">
// AlertDialogContent — the centered panel + dimmed overlay.
//
// Same panel and overlay as DialogContent, with one deliberate difference: there is NO
// close (X). A confirm has exactly two answers and both are buttons; an X is a third,
// silent one that reads as neither.
import {
  AlertDialogContent,
  type AlertDialogContentEmits,
  type AlertDialogContentProps,
  AlertDialogOverlay,
  AlertDialogPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<AlertDialogContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<AlertDialogContentEmits>()

// Pass reka-ui props through, but keep our own `class` out of the forwarded set.
const forwarded = useForwardPropsEmits(() => {
  const { class: _ignored, ...rest } = props
  return rest
}, emits)
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay
      class="fixed inset-0 z-50 bg-grey-900/40 data-[state=open]:animate-in data-[state=closed]:animate-out"
    />
    <AlertDialogContent
      v-bind="forwarded"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-grey-300 bg-white p-6 shadow-500 focus:outline-none',
          props.class,
        )
      "
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
