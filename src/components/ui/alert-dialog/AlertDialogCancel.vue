<script setup lang="ts">
// AlertDialogCancel — the safe choice, and where reka-ui puts initial focus.
// Use `as-child` to wrap our own Button so it keeps the design-system styling.
import { AlertDialogCancel, type AlertDialogCancelProps, useForwardProps } from 'reka-ui'

const props = defineProps<AlertDialogCancelProps>()
const forwarded = useForwardProps(props)
</script>

<template>
  <AlertDialogCancel v-bind="forwarded">
    <slot />
  </AlertDialogCancel>
</template>
