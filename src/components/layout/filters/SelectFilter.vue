<script setup lang="ts">
// SelectFilter — a top-bar multi-select filter (used for Channel and Team).
// A pill trigger (icon + label + selected count) opens a Popover with a checkable
// list of mock options. Empty selection = "All" (nothing is actually filtered).
import { computed } from 'vue'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import Icon from '@/components/Icon.vue'
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
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-2 rounded-md border border-grey-300 bg-white px-3 text-sm font-medium text-grey-700 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-grey-100"
      >
        <Icon :name="icon" :size="16" class="text-grey-600" />
        <span>{{ label }}</span>
        <span
          v-if="count"
          class="flex h-5 min-w-5 items-center justify-center rounded-pill bg-leaf-100 px-1.5 text-xs font-semibold text-leaf-700"
        >
          {{ count }}
        </span>
        <Icon name="ChevronDown" :size="14" class="text-grey-400" />
      </button>
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
