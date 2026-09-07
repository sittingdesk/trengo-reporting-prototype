<script setup lang="ts">
// TabRow — the dashboard's tabs, under its header.
//
// Follows the tab pattern already used elsewhere in Trengo: quiet grey labels, the
// active one darker and bolder with a leaf underline, on a hairline that runs the full
// width. Deliberately no count badges — those earn their place when a tab holds
// countable items (contacts, notes), but a widget count tells the user nothing.
//
// The hairline is the one line kept when the header's container was removed: the active
// underline has to sit on something, or it floats.
//
// Read-only in this step. Add / rename / remove arrive in steps 11–13.
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useWorkspace } from '@/composables/useWorkspace'
import type { Dashboard } from '@/data/dashboards'

const props = defineProps<{ dashboard: Dashboard; activeTabId: string }>()

const { tabs, tabPath } = useWorkspace()

// Reuse the store's iteration filtering rather than re-deriving it: `tabs` is already
// every visible tab, flat, so intersecting keeps one rule in one place.
const visibleTabs = computed(() => {
  const allowed = new Set(tabs.value.map((t) => t.id))
  return props.dashboard.tabs.filter((t) => allowed.has(t.id))
})
</script>

<template>
  <nav
    v-if="visibleTabs.length"
    class="flex items-center gap-6 overflow-x-auto border-b border-grey-300 px-8 scroll-thin"
    aria-label="Dashboard tabs"
  >
    <RouterLink
      v-for="t in visibleTabs"
      :key="t.id"
      :to="tabPath(t.id)"
      class="relative shrink-0 py-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :class="
        t.id === activeTabId
          ? 'font-semibold text-grey-900'
          : 'font-medium text-grey-600 hover:text-grey-900'
      "
      :aria-current="t.id === activeTabId ? 'page' : undefined"
    >
      {{ t.name }}
      <!-- Sits on the hairline, not above it, so the active tab reads as connected to
           the content below. -->
      <span
        v-if="t.id === activeTabId"
        class="absolute inset-x-0 -bottom-px h-0.5 rounded-t-sm bg-leaf-500"
        aria-hidden="true"
      />
    </RouterLink>
  </nav>
</template>
