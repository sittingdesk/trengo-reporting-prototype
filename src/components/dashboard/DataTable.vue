<script setup lang="ts">
// DataTable — a compact, themed table for table-type metric widgets.
// Fixed-height scroll (sticky header) + click-to-sort columns, so it stays bounded
// and scannable/rankable even with many rows (e.g. 50 agents). No "Load more".
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import type { TableColumn } from '@/lib/mock'
import Icon from '@/components/Icon.vue'
import { deltaOf, toneClassFor } from '@/lib/delta'
import { Tooltip } from '@/components/ui/tooltip'

const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: Record<string, string | number>[]
    /** The body budget this table has to fill, in px — the card's height minus its chrome.
     *  288 is the full-width table's, which puts its card on 362. A half-width table that
     *  wants to sit beside 274px charts passes 200. It is both a MIN and a MAX: the body
     *  holds its footprint at one row, and scrolls rather than growing at ten. */
    height?: number
  }>(),
  { height: 288 },
)

const sortKeyOf = (c: TableColumn) => c.sortKey ?? c.key

// Default ranking: a column that asks for one wins; otherwise the first sortable
// numeric column (one with a sortKey), descending.
const defaultCol = computed(
  () =>
    props.columns.find((c) => c.sortable && c.defaultSort) ??
    props.columns.find((c) => c.sortable && c.sortKey) ??
    props.columns.find((c) => c.sortable),
)

const chosenKey = ref<string | null>(null)
const chosenDir = ref<'asc' | 'desc' | null>(null)

// Columns can come and go (a capability being switched off), so the active sort is
// validated against the columns actually on screen rather than latched at setup.
const sortKey = computed(() => {
  const live = props.columns.some((c) => c.sortable && sortKeyOf(c) === chosenKey.value)
  if (chosenKey.value && live) return chosenKey.value
  return defaultCol.value ? sortKeyOf(defaultCol.value) : null
})
const sortDir = computed<'asc' | 'desc'>(() => {
  const live = props.columns.some((c) => c.sortable && sortKeyOf(c) === chosenKey.value)
  if (chosenKey.value && live && chosenDir.value) return chosenDir.value
  return defaultCol.value?.defaultSort ?? 'desc'
})

function toggleSort(c: TableColumn) {
  if (!c.sortable) return
  const key = sortKeyOf(c)
  if (sortKey.value === key) {
    chosenDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    // numeric → high-first, name → A–Z, unless the column states its own preference
    chosenDir.value = c.defaultSort ?? (c.sortKey ? 'desc' : 'asc')
  }
  chosenKey.value = key
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

/**
 * Period-over-period change per cell, computed once per render rather than per reference.
 *
 * Two conditions, both required: the column states which way is good (`direction`), and
 * the row carries a `<key>Prev` raw value. A column with no direction shows no change —
 * that is how Pipeline opts out, and it means a column can never render a change whose
 * meaning nobody decided.
 *
 * Same rules as a metric card's delta, because it is the same function: ±5% before any
 * colour, an arrow from ±0.05%, unsigned text. A table that judged a 3% wobble while the
 * card beside it called the same move nothing would be the worst of both.
 */
const cellDeltas = computed(() =>
  sortedRows.value.map((row) => {
    const out: Record<string, ReturnType<typeof deltaOf> | undefined> = {}
    for (const col of props.columns) {
      if (!col.direction) continue
      const prev = row[`${col.key}Prev`]
      const current = row[sortKeyOf(col)]
      if (typeof prev === 'number' && typeof current === 'number') {
        out[col.key] = deltaOf(current, prev, col.direction)
      }
    }
    return out
  }),
)

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
    <div
      ref="scroller"
      class="overflow-auto scroll-thin"
      :style="{ minHeight: `${height}px`, maxHeight: `${height}px` }"
      @scroll="updateFade"
    >
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
              <!-- A table packs several metrics into one tile, so a column carrying a
                   definition explains itself here rather than in the card tooltip. -->
              <Tooltip v-if="col.hint" :text="col.hint">
                <span
                  class="flex cursor-default items-center text-grey-400 transition-colors hover:text-grey-600"
                  @click.stop
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="8" fill="currentColor" />
                    <circle cx="8" cy="4.6" r="1.1" fill="#fff" />
                    <rect x="6.9" y="6.7" width="2.2" height="5" rx="1.1" fill="#fff" />
                  </svg>
                </span>
              </Tooltip>
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
            <!-- Value, then its change — inline, so a delta costs the row no height and
                 `tableBodyHeight`'s 41px per row stays true. The arrow carries the sign
                 and the direction, so the colour is never the only signal — and since
                 error-600 landed, the colour clears AA at this size too.
                 The change is the cell's OWN size, not a step down. On a card the delta is
                 12px against a 36px number — 3×, unmistakably another tier. Here it would
                 be 12 against 14, a ratio of 1.17 that reads as a mistake rather than a
                 hierarchy. Same size, and the separation comes from tone and the arrow —
                 which is what MetricBox's header totals already do with a label and its
                 number at one size.
                 The value stays primary without being made heavier: inside the 5% band the
                 change is grey-600 against the cell's grey-700, a shade quieter, and it
                 only takes a colour once it clears the band. The colour then means "worth
                 looking at", which is what the band is for. -->
            <template v-else-if="cellDeltas[i]?.[col.key]">
              <!-- items-center, not items-baseline. Baseline alignment was right while the
                   change was smaller than the value; now they're the same size their
                   baselines and centres coincide anyway, and centring stops a 16px icon
                   hanging below the baseline and growing the row from 41px to 44. -->
              <span class="inline-flex items-center gap-2">
                {{ row[col.key] }}
                <!-- h-5/leading-5 pins this group to the cell's 20px line box. A 16px
                     icon is taller than a 14px text baseline allows, so without it the
                     arrow pushed every row from 41px to 44 — and `tableBodyHeight` says
                     41, so the rows would have outgrown the body height the card derives
                     from it. -->
                <span class="inline-flex h-5 items-center gap-1 leading-5">
                  <Icon
                    v-if="cellDeltas[i][col.key]!.up || cellDeltas[i][col.key]!.down"
                    :name="cellDeltas[i][col.key]!.up ? 'TrendUp' : 'TrendDown'"
                    :size="16"
                    class="shrink-0 self-center"
                    :class="toneClassFor(cellDeltas[i][col.key]!.tone)"
                  />
                  <span :class="toneClassFor(cellDeltas[i][col.key]!.tone)">{{
                    cellDeltas[i][col.key]!.pct
                  }}</span>
                </span>
              </span>
            </template>
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
