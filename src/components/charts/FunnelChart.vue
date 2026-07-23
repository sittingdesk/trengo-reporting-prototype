<script setup lang="ts">
// FunnelChart — a horizontal funnel: one row per stage with a proportional bar
// (widest at the top) and the count. Plain divs + design tokens (no Chart.js).
import { computed } from 'vue'
import { fmtCount } from '@/lib/format'

const props = defineProps<{ rows: { stage: string; count: number }[] }>()

const max = computed(() => Math.max(1, ...props.rows.map((r) => r.count)))
</script>

<template>
  <div class="flex flex-1 flex-col justify-center gap-4">
    <div v-for="row in rows" :key="row.stage" class="flex items-center gap-3">
      <span class="w-24 shrink-0 truncate text-xs font-medium text-grey-600">{{ row.stage }}</span>
      <div class="relative h-7 flex-1 overflow-hidden rounded-[3px] bg-grey-100">
        <div
          class="h-full rounded-[3px] bg-leaf-400 transition-[width] duration-300"
          :style="{ width: `${Math.max(2, (row.count / max) * 100)}%` }"
        />
      </div>
      <span class="w-14 shrink-0 text-right text-sm font-semibold text-grey-900 tabular-nums">
        {{ fmtCount(row.count) }}
      </span>
    </div>
  </div>
</template>
