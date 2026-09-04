<script setup lang="ts">
// MetricErrorState — shown when a widget's data could not be loaded.
//
// Deliberately distinct from MetricEmptyState: empty is a FACT ("we asked, there were
// none"), error is an UNKNOWN ("we couldn't ask"). So this never renders a number, a
// zero, or "no … in this period" — and it always offers a way out. The retry button is
// the clearest signal of which state you're in; tone stays restrained so a partial
// outage reads as "these need a retry", not "everything is broken".
//
// Sizing: `minHeight` mirrors the widget's normal body height, so an errored card keeps
// its footprint — the grid doesn't reflow when only some endpoints fail, and retrying
// never resizes the card. Retry feedback lives IN the button (not a body swap) for the
// same reason.
import Icon from '@/components/Icon.vue'
import { COPY } from '@/data/emptyStates'

withDefaults(defineProps<{ minHeight?: number; retrying?: boolean }>(), { retrying: false })
defineEmits<{ retry: [] }>()
</script>

<template>
  <!-- role=alert (empty uses role=status): a failed load is worth announcing. -->
  <div
    role="alert"
    class="flex flex-1 flex-col items-center justify-center gap-2 px-3 text-center"
    :style="minHeight ? { minHeight: `${minHeight}px` } : undefined"
  >
    <!-- No chip, matching MetricEmptyState — these are sibling states and have to keep
         looking like siblings; the retry button is what tells them apart. -->
    <Icon name="AlertTriangle" :size="20" class="text-grey-600" aria-hidden="true" />

    <div class="flex flex-col items-center gap-2">
      <span class="text-xs font-semibold text-grey-800">{{ COPY.error.title() }}</span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-base border border-grey-300 bg-white px-2 py-1 text-xs font-semibold text-grey-900 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:text-grey-500"
        :disabled="retrying"
        @click="$emit('retry')"
      >
        <Icon
          name="RefreshCw"
          :size="14"
          class="text-grey-500"
          :class="retrying ? 'animate-spin' : ''"
          aria-hidden="true"
        />
        {{ retrying ? COPY.error.retrying() : COPY.error.retry() }}
      </button>
    </div>
  </div>
</template>
