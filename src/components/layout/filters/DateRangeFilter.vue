<script setup lang="ts">
// DateRangeFilter — top-bar date filter. A pill trigger (calendar icon + active
// range label) opens a Popover with preset shortcuts on the left and a range
// calendar on the right (select start → end).
//
// The calendar is left UNCONTROLLED (`default-value`) so its in-progress
// start→end selection isn't reset by us feeding the value back mid-pick; we just
// listen for changes. Choosing a preset bumps `calKey` to remount the calendar
// with the preset's range as the new default.
import { ref } from 'vue'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import FilterChip from '@/components/layout/filters/FilterChip.vue'
import { DATE_PRESETS } from '@/data/filters'
import { useFilters } from '@/composables/useFilters'

const { dateRange, presetId, dateRangeLabel, setPreset, setRange } = useFilters()

const calKey = ref(0)
function choosePreset(id: string) {
  setPreset(id)
  calKey.value++ // remount so the calendar jumps to the preset's range
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <!-- Never `active`: a date range is always set, so there is no un-narrowed state
           for it to stand out against. -->
      <FilterChip icon="CalendarDates">{{ dateRangeLabel }}</FilterChip>
    </PopoverTrigger>

    <PopoverContent align="end" class="flex w-auto p-0">
      <!-- Presets -->
      <ul class="w-40 shrink-0 border-r border-grey-200 p-2">
        <li v-for="preset in DATE_PRESETS" :key="preset.id">
          <button
            type="button"
            class="w-full rounded-base px-3 py-1.5 text-left text-sm transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
            :class="presetId === preset.id ? 'bg-grey-100 font-semibold text-grey-900' : 'text-grey-700'"
            @click="choosePreset(preset.id)"
          >
            {{ preset.label }}
          </button>
        </li>
      </ul>

      <!-- Calendar -->
      <div class="p-3">
        <RangeCalendar
          :key="calKey"
          :default-value="dateRange"
          :default-placeholder="dateRange.start"
          :week-starts-on="0"
          locale="en-US"
          @update:model-value="setRange"
        />
      </div>
    </PopoverContent>
  </Popover>
</template>
