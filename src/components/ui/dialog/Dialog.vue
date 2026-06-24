<script setup lang="ts">
// Dialog root — controls open/close. Use with v-model:open.
// Forwards props/emits to reka-ui's DialogRoot (the accessibility engine).
import { DialogRoot, useForwardPropsEmits, type DialogRootEmits, type DialogRootProps } from 'reka-ui'

const props = defineProps<DialogRootProps>()
const emits = defineEmits<DialogRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <DialogRoot v-bind="forwarded">
    <slot />
  </DialogRoot>
</template>
