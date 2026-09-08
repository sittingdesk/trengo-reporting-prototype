<script setup lang="ts">
// shadcn-vue Input — a themed text field with v-model support.
//
// Focus uses `shadow-focus`, which is design.md §5.2's `focus-default` — "Standard focus
// ring (inputs, buttons)", a 4px leaf glow with a 1px inset edge. It previously used
// Tailwind's `ring-2` plus a border swap, which is a different shape from every inline
// editor in the app (InlineEditName uses the token), so the two didn't match side by side.
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

defineProps<{ class?: HTMLAttributes['class'] }>()

// Two-way bound value (use as <Input v-model="..." />).
const model = defineModel<string>()
</script>

<template>
  <input
    v-model="model"
    :class="
      cn(
        'flex h-10 w-full rounded-md border border-grey-300 bg-white px-3 text-sm text-grey-900 placeholder:text-grey-400 transition-colors focus:outline-none focus-visible:border-leaf-500 focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50',
        $props.class,
      )
    "
  />
</template>
