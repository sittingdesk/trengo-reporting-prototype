<script setup lang="ts">
// DataTable — a compact, themed table for table-type metric widgets.
// Optional `initialRows` collapses the table; a "Load more" button reveals the rest.
import { ref, computed } from 'vue'
import type { TableColumn } from '@/lib/mock'

const props = defineProps<{
  columns: TableColumn[]
  rows: Record<string, string | number>[]
  initialRows?: number
}>()

const expanded = ref(false)
// Whether the table is collapsible at all (more rows than the initial count).
const canToggle = computed(() => !!props.initialRows && props.rows.length > props.initialRows!)
const visibleRows = computed(() =>
  canToggle.value && !expanded.value ? props.rows.slice(0, props.initialRows!) : props.rows,
)
</script>

<template>
  <div>
    <div class="overflow-x-auto scroll-thin">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              class="whitespace-nowrap pb-2 pr-4 text-xs font-medium text-grey-600 last:pr-0"
              :class="col.align === 'right' ? 'text-right' : 'text-left'"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in visibleRows" :key="i" class="border-t border-grey-200">
            <td
              v-for="(col, c) in columns"
              :key="col.key"
              class="whitespace-nowrap py-2.5 pr-4 last:pr-0"
              :class="[
                col.align === 'right' ? 'text-right' : 'text-left',
                c === 0 ? 'font-medium text-grey-900' : 'text-grey-700',
                c > 0 && !col.badge ? 'tabular-nums' : '',
              ]"
            >
              <span
                v-if="col.badge"
                class="rounded-pill bg-grey-200 px-2 py-0.5 text-xs font-semibold text-grey-600"
              >{{ row[col.key] }}</span>
              <template v-else>{{ row[col.key] }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="canToggle" class="mt-3 flex justify-center">
      <button
        type="button"
        class="rounded-base text-sm font-semibold text-grey-700 transition-colors hover:text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Show less' : 'Load more' }}
      </button>
    </div>
  </div>
</template>
