<script setup lang="ts">
// PopoverContent — the floating panel, teleported to <body> and positioned
// under the trigger. Styling matches the dialog (white card, grey border, shadow).
import {
  PopoverContent,
  type PopoverContentEmits,
  type PopoverContentProps,
  PopoverPortal,
  useForwardPropsEmits,
} from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<PopoverContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    align: 'start',
    sideOffset: 6,
  },
)
const emits = defineEmits<PopoverContentEmits>()

// Keep our own `class` out of the forwarded reka-ui props.
const forwarded = useForwardPropsEmits(() => {
  const { class: _ignored, ...rest } = props
  return rest
}, emits)
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      v-bind="forwarded"
      :class="
        cn(
          'z-50 w-56 rounded-lg border border-grey-300 bg-white p-1.5 shadow-300 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out',
          props.class,
        )
      "
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>
