<script setup lang="ts">
// EditModeBar — the band that says you are editing, and lets you stop.
//
// It exists because the mode's only global signal used to be a 32px button in the header,
// and the header scrolls away: `<main>` is the single scroll container and nothing in this
// app is sticky, by a deliberate decision (DashboardView's header comment). Past one
// viewport of scroll, the only evidence you were in a destructive mode was a trash icon
// per card — and per-element controls read as decoration, not as mode.
//
// So this breaks "nothing is sticky", in edit mode only. That asymmetry IS the contrast:
// view mode stays one uninterrupted page, edit mode gains chrome that follows you.
//
// Grey-900 because only the rail wears it — it can't be mistaken for a card, a filter or
// an error — and because it's the colour the Edit button already turns when active, so the
// band reads as that button expanded into a row rather than as a new species of thing.
import Icon from '@/components/Icon.vue'
import { Button } from '@/components/ui/button'

defineProps<{ canAdd: boolean }>()
const emit = defineEmits<{ add: []; done: [] }>()
</script>

<template>
  <!-- role=region, not toolbar: toolbar earns its keep with arrow-key navigation, and two
       buttons don't justify implementing it. -->
  <div
    class="sticky top-0 z-10 flex items-center gap-4 bg-grey-900 px-8 py-2 text-white"
    role="region"
    aria-label="Editing"
  >
    <p class="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
      <Icon name="Edit" :size="20" class="shrink-0 text-grey-400" />
      <span class="truncate">Editing — add or remove widgets</span>
    </p>
    <!-- The light control is the escape hatch, so the way out is the brightest thing on a
         dark band. Add widget is the quieter of the two: it's the repeatable action, and
         the panel it opens is the loud part. -->
    <Button
      v-if="canAdd"
      variant="ghost"
      size="sm"
      class="shrink-0 text-white hover:bg-white/15 hover:text-white"
      @click="emit('add')"
    >
      <Icon name="Plus" :size="20" />
      Add widget
    </Button>
    <Button variant="field" size="sm" class="shrink-0" @click="emit('done')">
      <Icon name="Check" :size="20" />
      Done
    </Button>
  </div>
</template>
