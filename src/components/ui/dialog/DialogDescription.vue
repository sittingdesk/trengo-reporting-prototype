<script setup lang="ts">
// DialogDescription — supporting text under the title.
import { DialogDescription, type DialogDescriptionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<DialogDescriptionProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <DialogDescription :class="cn('text-sm text-grey-600', props.class)">
    <slot />
  </DialogDescription>
</template>
