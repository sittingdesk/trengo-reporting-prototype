<script setup lang="ts">
// AlertDialogTitle — the accessible heading reka-ui announces on open.
import { AlertDialogTitle, type AlertDialogTitleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<AlertDialogTitleProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <AlertDialogTitle :class="cn('text-lg font-bold text-grey-900', props.class)">
    <slot />
  </AlertDialogTitle>
</template>
