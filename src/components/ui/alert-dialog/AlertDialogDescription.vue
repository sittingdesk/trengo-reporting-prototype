<script setup lang="ts">
// AlertDialogDescription — supporting text under the title. In a confirm this carries
// the consequence, so it is always visible rather than sr-only.
import { AlertDialogDescription, type AlertDialogDescriptionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<AlertDialogDescriptionProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <AlertDialogDescription :class="cn('text-sm text-grey-600', props.class)">
    <slot />
  </AlertDialogDescription>
</template>
