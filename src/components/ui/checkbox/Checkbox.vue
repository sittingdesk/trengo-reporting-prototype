<script setup lang="ts">
// shadcn-vue Checkbox — built on reka-ui's Checkbox primitive. Supports the
// three states via `model-value`: true (check), false (empty), 'indeterminate'
// (dash) — the last is used for partially-selected parents.
//
// In the Channel filter the rows own the click, so this is often rendered purely
// as a visual (pass `pointer-events-none` via class); reka still renders the
// correct indicator from `model-value`.
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import Icon from '@/components/Icon.vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue?: boolean | 'indeterminate'
  class?: HTMLAttributes['class']
}>()

defineEmits<{ 'update:modelValue': [value: boolean | 'indeterminate'] }>()
</script>

<template>
  <CheckboxRoot
    :model-value="props.modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :class="
      cn(
        'flex size-4 shrink-0 items-center justify-center rounded-sm border border-grey-300 bg-white text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=checked]:border-leaf-500 data-[state=checked]:bg-leaf-500 data-[state=indeterminate]:border-leaf-500 data-[state=indeterminate]:bg-leaf-500',
        props.class,
      )
    "
  >
    <CheckboxIndicator class="flex items-center justify-center">
      <Icon v-if="modelValue === 'indeterminate'" name="Minus" :size="12" />
      <Icon v-else name="Check" :size="12" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
