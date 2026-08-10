<script setup lang="ts">
// DataTable — a compact, themed table for table-type metric widgets.
// Fixed-height scroll (sticky header) + click-to-sort columns, so it stays bounded
// and scannable/rankable even with many rows (e.g. 50 agents). No "Load more".
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import type { TableColumn } from '@/lib/mock'

const props = defineProps<{
  columns: TableColumn[]
  rows: Record<string, string | number>[]
}>()

const sortKeyOf = (c: TableColumn) => c.sortKey ?? c.key

// Default: rank by the first sortable numeric column (one with a sortKey), descending.
const initial = props.columns.find((c) => c.sortable && c.sortKey) ?? props.columns.find((c) => c.sortable)
const sortKey = ref<string | null>(initial ? sortKeyOf(initial) : null)
const sortDir = ref<'asc' | 'desc'>('desc')

function toggleSort(c: TableColumn) {
  if (!c.sortable) return
  const key = sortKeyOf(c)
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = c.sortKey ? 'desc' : 'asc' // numeric → high-first; name → A–Z
  }
}
const isActive = (c: TableColumn) => c.sortable && sortKey.value === sortKeyOf(c)

// Initials avatars (deterministic colour per name — no assets, GDPR-safe).
const AVATAR_COLORS = [
  'bg-leaf-200 text-leaf-800',
  'bg-sky-200 text-sky-800',
  'bg-purple-200 text-purple-800',
  'bg-peach-200 text-peach-800',
  'bg-sun-200 text-sun-800',
]
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const chars = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)
  return chars.toUpperCase()
}
function colorFor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

const sortedRows = computed(() => {
  const key = sortKey.value
  if (!key) return props.rows
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...props.rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv)) * dir
  })
})

// Bottom fade — hints there's more to scroll; hides once the last row is reached.
const scroller = ref<HTMLElement | null>(null)
const showFade = ref(false)
function updateFade() {
  const el = scroller.value
  if (el) showFade.value = el.scrollHeight - el.scrollTop - el.clientHeight > 4
}
onMounted(() => nextTick(updateFade))
watch(sortedRows, () => nextTick(updateFade))
</script>

<template>
  <div class="relative">
    <div ref="scroller" class="max-h-[288px] overflow-auto scroll-thin" @scroll="updateFade">
    <table class="w-full border-collapse text-sm">
      <thead class="sticky top-0 z-[1] bg-white">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="whitespace-nowrap border-b border-grey-200 bg-white pb-2 pr-4 text-xs font-medium text-grey-600 last:pr-0"
            :class="[
              col.align === 'right' ? 'text-right' : 'text-left',
              col.sortable ? 'cursor-pointer select-none hover:text-grey-900' : '',
              isActive(col) ? 'text-grey-900' : '',
            ]"
            @click="toggleSort(col)"
          >
            <span class="inline-flex items-center gap-1">
              {{ col.label }}
              <span v-if="isActive(col)" aria-hidden="true">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in sortedRows" :key="i" class="border-t border-grey-200 first:border-t-0">
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
            <span v-else-if="col.avatar" class="flex items-center gap-2">
              <span
                class="flex size-6 shrink-0 items-center justify-center rounded-circle text-[10px] font-semibold"
                :class="colorFor(String(row[col.key]))"
                aria-hidden="true"
              >{{ initials(String(row[col.key])) }}</span>
              {{ row[col.key] }}
            </span>
            <template v-else>{{ row[col.key] }}</template>
          </td>
        </tr>
      </tbody>
    </table>
    </div>
    <!-- Bottom fade: sneak-peek there's more below (hidden at the end) -->
    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent transition-opacity duration-200"
      :class="showFade ? 'opacity-100' : 'opacity-0'"
      aria-hidden="true"
    />
  </div>
</template>
