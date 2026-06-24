<script setup lang="ts">
// RangeCalendar — shadcn-vue range calendar (single file, condensed).
//
// Built on reka-ui's RangeCalendar primitives; range start/end carry data-attrs
// we style with leaf tokens: in-range cells get a light leaf track (rounded at
// the row/range ends), the start & end days get a solid leaf chip.
import { type HTMLAttributes } from 'vue'
import {
  RangeCalendarRoot,
  type RangeCalendarRootProps,
  type RangeCalendarRootEmits,
  RangeCalendarHeader,
  RangeCalendarHeading,
  RangeCalendarPrev,
  RangeCalendarNext,
  RangeCalendarGrid,
  RangeCalendarGridHead,
  RangeCalendarGridBody,
  RangeCalendarGridRow,
  RangeCalendarHeadCell,
  RangeCalendarCell,
  RangeCalendarCellTrigger,
  useForwardPropsEmits,
} from 'reka-ui'
import Icon from '@/components/Icon.vue'
import { cn } from '@/lib/utils'

const props = defineProps<RangeCalendarRootProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<RangeCalendarRootEmits>()

const forwarded = useForwardPropsEmits(() => {
  const { class: _ignored, ...rest } = props
  return rest
}, emits)

// Continuous light-green track for the in-range cells, rounded at row + range ends.
const cellClass = cn(
  'relative p-0 text-center text-sm',
  '[&:has([data-selected])]:bg-leaf-100',
  'first:[&:has([data-selected])]:rounded-l-md last:[&:has([data-selected])]:rounded-r-md',
  '[&:has([data-selection-start])]:rounded-l-md [&:has([data-selection-end])]:rounded-r-md',
)

// Day chip: hover, today ring, solid leaf for the two endpoints, muted outside-month.
const triggerClass = cn(
  'flex size-9 items-center justify-center rounded-md text-sm font-normal text-grey-900',
  'hover:bg-grey-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'data-[today]:font-semibold data-[today]:ring-1 data-[today]:ring-inset data-[today]:ring-leaf-500',
  'data-[selection-start]:bg-leaf-500 data-[selection-start]:text-white data-[selection-start]:ring-0',
  'data-[selection-end]:bg-leaf-500 data-[selection-end]:text-white data-[selection-end]:ring-0',
  'data-[outside-view]:text-grey-400',
  'data-[disabled]:text-grey-400 data-[disabled]:opacity-50',
)
</script>

<template>
  <RangeCalendarRoot
    v-slot="{ grid, weekDays }"
    :class="cn('select-none', props.class)"
    v-bind="forwarded"
  >
    <RangeCalendarHeader class="flex items-center justify-between pb-3">
      <RangeCalendarPrev
        class="flex size-7 items-center justify-center rounded-md text-grey-600 hover:bg-grey-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon name="ChevronLeft" :size="16" />
      </RangeCalendarPrev>
      <RangeCalendarHeading class="text-sm font-semibold text-grey-900" />
      <RangeCalendarNext
        class="flex size-7 items-center justify-center rounded-md text-grey-600 hover:bg-grey-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon name="ChevronRight" :size="16" />
      </RangeCalendarNext>
    </RangeCalendarHeader>

    <RangeCalendarGrid v-for="month in grid" :key="month.value.toString()" class="w-full border-collapse">
      <RangeCalendarGridHead>
        <RangeCalendarGridRow class="flex">
          <RangeCalendarHeadCell
            v-for="day in weekDays"
            :key="day"
            class="flex size-9 items-center justify-center text-xs font-medium text-grey-600"
          >
            {{ day.charAt(0) }}
          </RangeCalendarHeadCell>
        </RangeCalendarGridRow>
      </RangeCalendarGridHead>
      <RangeCalendarGridBody>
        <RangeCalendarGridRow
          v-for="(weekDates, index) in month.rows"
          :key="`weekDate-${index}`"
          class="flex w-full"
        >
          <RangeCalendarCell
            v-for="weekDate in weekDates"
            :key="weekDate.toString()"
            :date="weekDate"
            :class="cellClass"
          >
            <RangeCalendarCellTrigger :day="weekDate" :month="month.value" :class="triggerClass" />
          </RangeCalendarCell>
        </RangeCalendarGridRow>
      </RangeCalendarGridBody>
    </RangeCalendarGrid>
  </RangeCalendarRoot>
</template>
