<script setup lang="ts">
// TabsSidebar — the second left sidebar: the user's dashboard TABS.
//
// Tabs are user content (created from templates), so they're text-only (no
// icons) and the active one is highlighted. "+ New" opens the template gallery.
// At the bottom sits a clearly-labelled PROTOTYPE scenario switcher to demo the
// "existing customer" (seeded) vs "new customer" (empty) onboarding states.
import { RouterLink, useRouter } from 'vue-router'
import Icon from '@/components/Icon.vue'
import { useWorkspace, type Scenario } from '@/composables/useWorkspace'
import { useSettings } from '@/composables/useSettings'
import { ITERATIONS } from '@/config/iterations'

const router = useRouter()
const {
  tabs,
  scenario,
  iterationId,
  allowNewDashboard,
  allowRemoveDashboard,
  allowScenarioToggle,
  openGallery,
  removeTab,
  setScenario,
  setIteration,
} = useWorkspace()
const { showComparison, toggleComparison, showEmptyData, toggleEmptyData } = useSettings()

const scenarios: { id: Scenario; label: string }[] = [
  { id: 'existing', label: 'Existing customer' },
  { id: 'new', label: 'New customer' },
]

// After changing scenario/iteration, land on the first visible tab (or welcome).
function goToFirstTab() {
  router.push(tabs.value.length ? `/d/${tabs.value[0].id}` : '/welcome')
}

function switchScenario(id: Scenario) {
  setScenario(id)
  goToFirstTab()
}

function changeIteration(id: string) {
  setIteration(id)
  goToFirstTab()
}
</script>

<template>
  <aside class="flex w-60 shrink-0 flex-col border-r border-grey-300 bg-grey-100">
    <!-- Heading + create -->
    <div class="flex items-center justify-between px-4 pb-2 pt-5">
      <h2 class="text-lg font-bold text-grey-900">Analytics</h2>
      <button
        v-if="allowNewDashboard"
        class="flex size-7 items-center justify-center rounded-base text-grey-600 transition-colors hover:bg-grey-200 hover:text-grey-900"
        title="New dashboard"
        @click="openGallery()"
      >
        <span class="text-lg leading-none">+</span>
      </button>
    </div>

    <!-- Tab list (text only, no icons) -->
    <nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 scroll-thin">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.id"
        :to="`/d/${tab.id}`"
        class="group flex items-center gap-2 rounded-base px-2.5 py-2 text-sm font-medium text-grey-700 transition-colors hover:bg-grey-200"
        active-class="!bg-grey-200 !text-grey-900"
      >
        <span class="flex-1 truncate">{{ tab.name }}</span>
        <!-- Remove on hover -->
        <button
          v-if="allowRemoveDashboard"
          class="hidden size-5 items-center justify-center rounded-sm text-grey-500 hover:bg-grey-300 hover:text-grey-900 group-hover:flex"
          title="Remove dashboard"
          @click.prevent.stop="removeTab(tab.id)"
        >
          <Icon name="cross" :size="14" />
        </button>
      </RouterLink>

      <!-- Add another -->
      <button
        v-if="allowNewDashboard"
        class="mt-1 flex items-center gap-2 rounded-base px-2.5 py-2 text-sm font-medium text-grey-600 transition-colors hover:bg-grey-200 hover:text-grey-900"
        @click="openGallery()"
      >
        <span class="text-base leading-none">+</span> New dashboard
      </button>
    </nav>

    <!-- Prototype-only controls -->
    <div class="space-y-3 border-t border-grey-300 p-3">
      <!-- Iteration (feature-flag set) -->
      <div>
        <div class="mb-1.5 text-xs font-medium text-grey-600">Iteration</div>
        <select
          class="w-full truncate rounded-base border border-grey-300 bg-white px-2 py-1.5 text-xs font-medium text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          :value="iterationId"
          @change="changeIteration(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="it in ITERATIONS" :key="it.id" :value="it.id">{{ it.label }}</option>
        </select>
      </div>

      <div v-if="allowScenarioToggle">
        <div class="mb-1.5 text-xs font-medium text-grey-600">Prototype scenario</div>
        <div class="flex gap-1 rounded-base bg-grey-200 p-0.5">
          <button
            v-for="s in scenarios"
            :key="s.id"
            class="flex-1 rounded-sm px-2 py-1 text-xs font-semibold transition-colors"
            :class="
              scenario === s.id
                ? 'bg-white text-grey-900 shadow-100'
                : 'text-grey-600 hover:text-grey-900'
            "
            @click="switchScenario(s.id)"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <!-- Comparison toggle (shows period-over-period deltas on cards) -->
      <button
        class="flex w-full items-center justify-between rounded-base px-1 text-xs font-medium text-grey-600"
        @click="toggleComparison()"
      >
        <span>Comparison</span>
        <span
          class="relative h-4 w-7 rounded-pill transition-colors"
          :class="showComparison ? 'bg-leaf-500' : 'bg-grey-300'"
        >
          <span
            class="absolute top-0.5 size-3 rounded-circle bg-white transition-all"
            :class="showComparison ? 'left-3.5' : 'left-0.5'"
          />
        </span>
      </button>

      <!-- Empty-data toggle (simulates "no events in range" to demo empty states) -->
      <button
        class="flex w-full items-center justify-between rounded-base px-1 text-xs font-medium text-grey-600"
        @click="toggleEmptyData()"
      >
        <span>Empty data</span>
        <span
          class="relative h-4 w-7 rounded-pill transition-colors"
          :class="showEmptyData ? 'bg-leaf-500' : 'bg-grey-300'"
        >
          <span
            class="absolute top-0.5 size-3 rounded-circle bg-white transition-all"
            :class="showEmptyData ? 'left-3.5' : 'left-0.5'"
          />
        </span>
      </button>
    </div>
  </aside>
</template>
