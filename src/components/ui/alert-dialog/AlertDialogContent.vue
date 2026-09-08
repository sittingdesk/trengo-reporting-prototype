<script setup lang="ts">
// AlertDialogContent — the centered panel + dimmed overlay.
//
// Same panel and overlay as DialogContent, with two deliberate differences.
//
// There is NO close (X): a confirm has exactly two answers and both are buttons, where an
// X is a third, silent one that reads as neither.
//
// And `disableOutsidePointerEvents` is passed EXPLICITLY. reka's DialogContentModal
// defaults it to true, but the AlertDialog chain spreads its own props on the way down and
// Vue casts an absent Boolean prop to `false` — so the default never applied, the layer
// never marked itself `pointer-events: auto`, and the panel sat inert under a body that
// another layer had set to `pointer-events: none`. Every button in it was unclickable by
// mouse while still responding to a scripted click, which is exactly the shape of bug that
// passes a scripted check and fails a user.
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
      disable-outside-pointer-events
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
