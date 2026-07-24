<script setup lang="ts">
// FunnelChart — a left-to-right tapering funnel (ported from the Sales Reporting V1
// "Sales Conversion Funnel"): a vertical bar per stage (height ∝ count, count inside,
// label below) with SVG trapezoid connectors + conversion-rate pills between stages.
// Plain divs + inline SVG — no chart library.
import { computed } from 'vue'
import { fmtCount, fmtPercent } from '@/lib/format'

const props = defineProps<{ rows: { stage: string; count: number }[] }>()

const H = 200 // bar-area height (px)
const W = 56 // connector width (px)

const max = computed(() => Math.max(1, ...props.rows.map((r) => r.count)))
const barH = (i: number) => Math.max(6, Math.round((props.rows[i].count / max.value) * H))

/** Trapezoid filling the taper between stage i and i+1 (y = H − barHeight). */
const trapPoints = (i: number) => {
  const y1 = H - barH(i)
  const y2 = H - barH(i + 1)
  return `0,${y1} 0,${H} ${W},${H} ${W},${y2}`
}
/** Stage-to-stage conversion rate (next ÷ current). */
const ratePct = (i: number) => {
  const cur = props.rows[i].count
  return cur > 0 ? fmtPercent(props.rows[i + 1].count / cur) : '—'
}
</script>

<template>
  <div class="flex flex-1 items-start pt-2">
    <template v-for="(row, i) in rows" :key="row.stage">
      <!-- Stage: bar (bottom-aligned) + label -->
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="flex flex-col justify-end" :style="{ height: `${H}px` }">
          <div
            class="flex items-center justify-center rounded-t-[2px] bg-leaf-300"
            :style="{ height: `${barH(i)}px` }"
          >
            <span class="text-sm font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
              {{ fmtCount(row.count) }}
            </span>
          </div>
        </div>
        <span class="mt-2 min-h-8 text-center text-[11px] font-semibold uppercase tracking-wide text-grey-600">
          {{ row.stage }}
        </span>
      </div>

      <!-- Connector: trapezoid taper + conversion-rate pill -->
      <div
        v-if="i < rows.length - 1"
        class="relative flex shrink-0 items-center justify-center"
        :style="{ width: `${W}px`, height: `${H}px` }"
      >
        <svg class="absolute inset-0 size-full" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
          <polygon :points="trapPoints(i)" fill="var(--color-leaf-100)" />
        </svg>
        <span class="relative z-[1] whitespace-nowrap rounded-pill bg-leaf-100 px-2 py-1 text-[11px] font-bold text-grey-700">
          {{ ratePct(i) }}
        </span>
      </div>
    </template>
  </div>
</template>
