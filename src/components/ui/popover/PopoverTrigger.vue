<script setup lang="ts">
// PopoverTrigger — the element that toggles the popover. Use `as-child` to make
// your own button the trigger.
import { PopoverTrigger, type PopoverTriggerProps } from 'reka-ui'

const props = defineProps<PopoverTriggerProps>()
</script>

<template>
  <PopoverTrigger v-bind="props">
    <slot />
  </PopoverTrigger>
</template>
