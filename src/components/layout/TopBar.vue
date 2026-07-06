<script setup lang="ts">
// TopBar — the header strip above the content.
// Left: the active tab's name + description. Right: the global filters
// (date / channel / team) and a secondary "Manage widgets" action.
//
// ⚠️ Filters are visual-only (they don't filter data yet) and "Manage widgets"
// is a styled placeholder — real widget management comes later.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import Icon from '@/components/Icon.vue'
import DateRangeFilter from '@/components/layout/filters/DateRangeFilter.vue'
import ChannelFilter from '@/components/layout/filters/ChannelFilter.vue'
import SelectFilter from '@/components/layout/filters/SelectFilter.vue'
import { useWorkspace } from '@/composables/useWorkspace'
import { useFilters } from '@/composables/useFilters'
import { TEAMS } from '@/data/filters'

const route = useRoute()
const { getTab, tabTemplate } = useWorkspace()
const { teamIds, toggleTeam, clearTeams } = useFilters()

const tabId = computed(() => (route.name === 'tab' ? String(route.params.tabId) : ''))
const tab = computed(() => (tabId.value ? getTab(tabId.value) : undefined))
const template = computed(() => (tabId.value ? tabTemplate(tabId.value) : undefined))

const title = computed(() => tab.value?.name ?? 'Analytics')
const subtitle = computed(() => template.value?.description ?? '')
</script>

<template>
  <header class="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-grey-300 bg-white px-6">
    <div class="min-w-0">
      <h1 class="truncate text-base font-semibold text-grey-900">{{ title }}</h1>
      <p v-if="subtitle" class="truncate text-xs text-grey-600">{{ subtitle }}</p>
    </div>

    <!-- Global filters + dashboard action (only on a dashboard tab). -->
    <div v-if="tab" class="flex shrink-0 items-center gap-2">
      <DateRangeFilter />
      <ChannelFilter />
      <SelectFilter
        label="Team"
        icon="Users"
        :options="TEAMS"
        :selected-ids="teamIds"
        @toggle="toggleTeam"
        @clear="clearTeams"
      />

      <!-- "Manage widgets" hidden for now (re-enable by removing v-if="false"). -->
      <template v-if="false">
        <div class="mx-1 h-6 w-px bg-grey-300" aria-hidden="true" />

        <Button variant="secondary" size="sm">
          <Icon name="Grid" :size="16" />
          Manage widgets
        </Button>
      </template>
    </div>
  </header>
</template>
