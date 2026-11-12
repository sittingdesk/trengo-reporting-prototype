<script setup lang="ts">
// Spinner — shadcn-vue's Spinner (an indicator for a wait of unknown length), drawn with the
// project's own Loader2 icon instead of lucide: icons come from `svg icons/` (CLAUDE.md).
// `role="status"` + a label so a screen reader hears that something is happening.
import type { HTMLAttributes } from 'vue'
import Icon from '@/components/Icon.vue'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{ class?: HTMLAttributes['class']; size?: number; label?: string }>(), {
  size: 16,
  label: 'Loading',
})
</script>

<template>
  <Icon name="Loader2" :size="props.size" role="status" :aria-label="props.label" :class="cn('animate-spin', props.class)" />
</template>
