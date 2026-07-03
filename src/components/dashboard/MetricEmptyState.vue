<script setup lang="ts">
// MetricEmptyState — the one renderer for all four empty situations
// (empty / adoption / definition / development). Copy + icon come from the
// config in src/data/emptyStates.ts; this component only lays them out:
// centered icon, quiet title, one-line nudge, and (adoption only) a CTA.
import { computed } from 'vue'
import Icon from '@/components/Icon.vue'
import { resolveEmptyState, COPY } from '@/data/emptyStates'

const props = defineProps<{ metricId: string }>()

const cfg = computed(() => resolveEmptyState(props.metricId))
const copy = computed(() => {
  const c = cfg.value
  switch (c.state) {
    case 'adoption':
      return { title: COPY.adoption.title(c), subline: null, cta: COPY.adoption.cta(c) }
    case 'definition':
      return { title: COPY.definition.title(), subline: COPY.definition.subline(), cta: null }
    case 'development':
      return { title: COPY.development.title(), subline: COPY.development.subline(), cta: null }
    default:
      return { title: COPY.empty.title(c), subline: COPY.empty.subline(), cta: null }
  }
})
</script>

<template>
  <!-- role=status announces the state change; keeps card height, centers content.
       Styling per Figma 6943:24467 — icon chip + 12px semibold title + muted subline. -->
  <div
    role="status"
    class="flex flex-1 flex-col items-center justify-center gap-4 px-3 py-2 text-center"
  >
    <!-- Icon chip: white rounded square with a hairline border -->
    <span class="flex items-center justify-center rounded-base border border-black/10 bg-white p-1.5">
      <Icon :name="cfg.icon" :size="20" class="text-grey-800" aria-hidden="true" />
    </span>

    <div class="flex flex-col items-center gap-1 pb-2">
      <span class="text-xs font-semibold text-grey-800">{{ copy.title }}</span>
      <span v-if="copy.subline" class="max-w-[180px] text-xs font-medium text-grey-600">{{ copy.subline }}</span>
      <a
        v-if="copy.cta"
        :href="cfg.ctaHref ?? '#'"
        class="mt-1 text-xs font-semibold text-leaf-600 hover:underline"
      >{{ copy.cta }}</a>
    </div>
  </div>
</template>
