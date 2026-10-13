<script setup lang="ts">
// BetaBadge — a grey "Beta" status tag beside the dashboard title for as long as the beta runs.
//
// It replaced "Beta · Share feedback" (Jeff, 2026-10-13): a plain label, not a control —
// without the "Share feedback" words, a click that opened a feedback note would be a hidden
// surprise. Where feedback goes is still undecided; when it is, it gets its own visible entry.
//
// The muted Badge, but with grey-700 text: the variant's grey-600 on grey-200 is ~4.2:1,
// under the 4.5:1 AA floor for 12px text; grey-700 is ~7:1.
import { Badge } from '@/components/ui/badge'
import { BETA_BADGE } from '@/data/releaseIntro'
</script>

<template>
  <Badge variant="muted" class="shrink-0 text-grey-700">{{ BETA_BADGE }}</Badge>
</template>
