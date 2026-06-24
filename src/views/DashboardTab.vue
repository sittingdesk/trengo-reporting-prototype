<script setup lang="ts">
// DashboardTab — renders one tab (looked up by the :tabId route param).
//
// A tab shows its template's widgets, in order. The metric box doesn't exist
// yet, so each widget is a PLACEHOLDER card (name + kind). Chart/table widgets
// render wider to hint their shape. This makes "a template is a collection of
// widgets in a certain order" tangible before real widgets land.
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkspace } from '@/composables/useWorkspace'
import type { WidgetKind } from '@/config/templates'
import Icon from '@/components/Icon.vue'
import { Button } from '@/components/ui/button'

const route = useRoute()
const router = useRouter()
const { getTab, tabTemplate } = useWorkspace()

const tabId = computed(() => String(route.params.tabId))
const tab = computed(() => getTab(tabId.value))
const template = computed(() => tabTemplate(tabId.value))

// If the tab id doesn't exist (e.g. after a scenario reseed), bounce home.
watch(
  tab,
  (t) => {
    if (!t) router.replace('/')
  },
  { immediate: true },
)

// Friendly labels for the placeholder "kind" tag.
const KIND_LABEL: Record<WidgetKind, string> = {
  value: 'Single value',
  trend: 'Line graph',
  histogram: 'By hour',
  table: 'Table',
  breakdown: 'Breakdown',
  tbd: 'TBD',
}

// Charts + tables take more room — span two columns on the wide grid.
const WIDE_KINDS: WidgetKind[] = ['trend', 'histogram', 'table']
function spanClass(kind: WidgetKind) {
  return WIDE_KINDS.includes(kind) ? 'lg:col-span-2' : ''
}
</script>

<template>
  <!-- Empty template (Overview, Understand, …): nothing added yet. -->
  <div
    v-if="tab && template && template.widgets.length === 0"
    class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
  >
    <div class="flex size-12 items-center justify-center rounded-circle bg-grey-200 text-grey-600">
      <Icon name="Grid" :size="22" />
    </div>
    <h2 class="text-base font-semibold text-grey-900">This dashboard is empty</h2>
    <p class="max-w-sm text-sm text-grey-600">
      Add widgets to start tracking the metrics that matter for “{{ tab.name }}”.
    </p>
    <Button variant="secondary" size="sm" class="mt-1">
      <Icon name="Grid" :size="16" />
      Manage widgets
    </Button>
  </div>

  <div v-else-if="tab && template" class="px-8 py-6">
    <!-- Ordered widget placeholders -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="(widget, i) in template.widgets"
        :key="i"
        class="flex min-h-[140px] flex-col rounded-lg border border-grey-300 bg-white p-4"
        :class="spanClass(widget.kind)"
      >
        <header class="mb-1 flex items-start justify-between gap-2">
          <h3 class="text-sm font-semibold text-grey-900">{{ widget.name }}</h3>
          <span class="shrink-0 rounded-full bg-grey-200 px-2 py-0.5 text-xs font-medium text-grey-600">
            {{ KIND_LABEL[widget.kind] }}
          </span>
        </header>
        <!-- Empty placeholder body (the metric box renders here later) -->
        <div class="mt-2 flex flex-1 items-center justify-center rounded-base border border-dashed border-grey-300 bg-grey-100">
          <span class="text-xs text-grey-400">Metric box coming soon</span>
        </div>
      </article>
    </div>
  </div>
</template>
