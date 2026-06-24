<script setup lang="ts">
// shadcn-vue Input — a themed text field with v-model support.
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
        'flex h-10 w-full rounded-md border border-grey-300 bg-white px-3 text-sm text-grey-900 placeholder:text-grey-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-leaf-500 disabled:cursor-not-allowed disabled:opacity-50',
        $props.class,
      )
    "
  />
</template>
