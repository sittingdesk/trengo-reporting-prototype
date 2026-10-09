<script setup lang="ts">
// BetaFeedbackPill — "Beta · Share feedback", beside the dashboard title for as long as the
// beta runs. The feedback ask lives HERE, in the product, rather than in the release
// modal: by the time someone is looking at a dashboard they have something to say.
//
// Beside the title, not among the filters: it describes the product's status, and the
// filter cluster is measured to drop its labels below 800px (DashboardHeader's
// COMPACT_ROW) — another ~150px there would squeeze the title on most screens.
//
// 28px tall: smaller than the 32px controls on the row, because it is a status first and a
// button second, and still above the 24px WCAG 2.5.8 target floor.
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import Icon from '@/components/Icon.vue'
import { BETA_FEEDBACK as COPY } from '@/data/releaseIntro'

defineProps<{
  /** Drop the words below the row's compact threshold, keeping the Beta tag. */
  compact?: boolean
}>()
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill border border-grey-300 bg-white pl-1 pr-2.5 text-xs font-semibold text-grey-700 transition-colors hover:border-grey-400 hover:text-grey-900 focus:outline-none focus-visible:shadow-focus-sm"
        :aria-label="compact ? `${COPY.badge} — ${COPY.label}` : undefined"
      >
        <span class="rounded-pill bg-leaf-100 px-2 py-0.5 text-leaf-700">{{ COPY.badge }}</span>
        <Icon v-if="compact" name="Comment" :size="16" />
        <span v-else>{{ COPY.label }}</span>
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-64 p-3">
      <p class="text-xs font-medium text-grey-700">{{ COPY.prototypeNote }}</p>
    </PopoverContent>
  </Popover>
</template>
