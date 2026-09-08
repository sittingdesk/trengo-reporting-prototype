<script setup lang="ts">
// AlertDialog root — controls open/close. Use with v-model:open.
//
// Separate from Dialog on purpose: an alert dialog demands an ANSWER. reka-ui gives it
// `role="alertdialog"`, blocks outside-click dismissal, and moves initial focus to the
// Cancel button rather than the first focusable thing — so a stray Enter or a click on
// the backdrop can never be the destructive choice. That's the whole reason a confirm
// isn't just a Dialog with two buttons in it.
import {
  AlertDialogRoot,
  useForwardPropsEmits,
  type AlertDialogEmits,
  type AlertDialogProps,
} from 'reka-ui'

const props = defineProps<AlertDialogProps>()
const emits = defineEmits<AlertDialogEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <AlertDialogRoot v-bind="forwarded">
    <slot />
  </AlertDialogRoot>
</template>
