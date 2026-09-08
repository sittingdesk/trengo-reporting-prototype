<script setup lang="ts">
// SelectFilter — a dashboard multi-select filter (used for Team).
// A chip trigger opens a Popover with a checkable list of mock options. Empty selection
// = "All" (nothing is actually filtered).
import { computed } from 'vue'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import Icon from '@/components/Icon.vue'
import FilterChip from '@/components/layout/filters/FilterChip.vue'
import type { FilterOption } from '@/data/filters'

const props = defineProps<{
  label: string
  icon: string
  options: FilterOption[]
  selectedIds: string[]
}>()

const emit = defineEmits<{
  toggle: [id: string]
  clear: []
}>()

const count = computed(() => props.selectedIds.length)
const isSelected = (id: string) => props.selectedIds.includes(id)

// The count goes IN the label rather than into a separate badge beside it — the chip's
// own colour now carries "this is filtering", so a badge would say it twice. Matches how
// the channel chip and the sidebar's scope subtitle already read.
const noun = computed(() => props.label.toLowerCase())
const triggerLabel = computed(() =>
  count.value ? `${count.value} ${count.value === 1 ? noun.value : `${noun.value}s`}` : props.label,
)
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <FilterChip :icon="icon" :active="count > 0">{{ triggerLabel }}</FilterChip>
    </PopoverTrigger>

    <PopoverContent>
      <div class="px-2 py-1.5 text-xs font-semibold text-grey-600">{{ label }}</div>
      <ul class="max-h-64 overflow-y-auto scroll-thin">
        <li v-for="opt in options" :key="opt.id">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-base px-2 py-1.5 text-left text-sm text-grey-900 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
            @click="emit('toggle', opt.id)"
          >
            <span
              class="flex size-4 shrink-0 items-center justify-center rounded-sm border"
              :class="
                isSelected(opt.id)
                  ? 'border-leaf-500 bg-leaf-500 text-white'
                  : 'border-grey-300 bg-white'
              "
            >
              <Icon v-if="isSelected(opt.id)" name="Check" :size="12" />
            </span>
            {{ opt.label }}
          </button>
        </li>
      </ul>
      <div v-if="count" class="mt-1 border-t border-grey-200 pt-1">
        <button
          type="button"
          class="w-full rounded-base px-2 py-1.5 text-left text-sm font-medium text-grey-600 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
          @click="emit('clear')"
        >
          Clear selection
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
