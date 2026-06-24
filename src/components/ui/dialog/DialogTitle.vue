<script setup lang="ts">
// DialogTitle — the accessible heading reka-ui announces to screen readers.
import { DialogTitle, type DialogTitleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <DialogTitle :class="cn('text-lg font-bold text-grey-900', props.class)">
    <slot />
  </DialogTitle>
</template>
