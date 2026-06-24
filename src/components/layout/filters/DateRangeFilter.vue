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
import Icon from '@/components/Icon.vue'
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
      <button
        type="button"
        class="inline-flex h-9 items-center gap-2 rounded-md border border-grey-300 bg-white px-3 text-sm font-medium text-grey-700 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-grey-100"
      >
        <Icon name="Calendar" :size="16" class="text-grey-600" />
        <span>{{ dateRangeLabel }}</span>
        <Icon name="ChevronDown" :size="14" class="text-grey-400" />
      </button>
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
