<script setup lang="ts">
// ChannelFilter — the top-bar channel filter as a two-panel Popover:
// a category list (left) → its instances (right), with tri-state parents.
// Selection is a set of instance ids in useFilters; "all selected" = no filter.
//
// ⚠️ Visual-only like the other filters — selecting a subset re-scales the mock
// numbers but nothing is really filtered.
import { computed, nextTick, ref } from 'vue'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import Icon from '@/components/Icon.vue'
import { CATALOG, CHANNEL_INSTANCE_IDS, type ChannelCategory } from '@/data/channelData'
import { useFilters } from '@/composables/useFilters'

const { channelIds, setChannels } = useFilters()

// Only categories that actually have instances (empty categories are hidden).
const categories = computed(() => CATALOG.filter((c) => c.instances.length > 0))
const total = CHANNEL_INSTANCE_IDS.length

const selected = computed(() => new Set(channelIds.value))
const allSelected = computed(() => selected.value.size === total)
const triggerLabel = computed(() =>
  allSelected.value ? 'All channels' : `${selected.value.size} channels`,
)

/** Tri-state for a checkbox given how many of `n` are selected. */
function triState(count: number, n: number): boolean | 'indeterminate' {
  if (count === 0) return false
  if (count === n) return true
  return 'indeterminate'
}

const isInstanceSelected = (id: string) => selected.value.has(id)
const categoryCount = (cat: ChannelCategory) =>
  cat.instances.reduce((n, i) => n + (selected.value.has(i.id) ? 1 : 0), 0)
const categoryState = (cat: ChannelCategory) =>
  triState(categoryCount(cat), cat.instances.length)
const allState = computed(() => triState(selected.value.size, total))

function commit(set: Set<string>) {
  setChannels([...set])
}

function toggleInstance(id: string) {
  const set = new Set(selected.value)
  set.has(id) ? set.delete(id) : set.add(id)
  commit(set)
}
function toggleCategory(cat: ChannelCategory) {
  const set = new Set(selected.value)
  const fullySelected = cat.instances.every((i) => set.has(i.id))
  for (const i of cat.instances) fullySelected ? set.delete(i.id) : set.add(i.id)
  commit(set)
}
function toggleAll() {
  commit(allSelected.value ? new Set() : new Set(CHANNEL_INSTANCE_IDS))
}
function clearAll() {
  commit(new Set())
}

// --- active category + keyboard focus movement between panels ---
// Nothing is open by default → the popover shows just the compact category list;
// the instance panel expands only once a category is opened.
const activeId = ref('')
const activeCategory = computed(() => categories.value.find((c) => c.id === activeId.value))
const rightPanel = ref<HTMLElement | null>(null)
const leftList = ref<HTMLElement | null>(null)

function openCategory(cat: ChannelCategory, focusRight = false) {
  activeId.value = cat.id
  if (focusRight) {
    nextTick(() => rightPanel.value?.querySelector<HTMLElement>('[data-instance]')?.focus())
  }
}
function focusLeft() {
  nextTick(() =>
    leftList.value?.querySelector<HTMLElement>(`[data-cat="${activeId.value}"]`)?.focus(),
  )
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-2 rounded-md border border-grey-300 bg-white px-3 text-sm font-medium text-grey-700 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-grey-100"
      >
        <Icon name="Hashtag" :size="16" class="text-grey-600" />
        <span>{{ triggerLabel }}</span>
        <Icon name="ChevronDown" :size="14" class="text-grey-400" />
      </button>
    </PopoverTrigger>

    <PopoverContent class="flex w-auto overflow-hidden p-0" :side-offset="6">
      <!-- Left panel: categories (the whole popover when nothing is expanded) -->
      <div class="flex w-60 flex-col" :class="{ 'border-r border-grey-200': activeCategory }">
        <div ref="leftList" class="flex-1 p-1.5">
          <!-- All channels -->
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-base px-2 py-1.5 text-left text-[13.5px] text-grey-900 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
            @click="toggleAll"
          >
            <Checkbox :model-value="allState" tabindex="-1" aria-hidden="true" class="pointer-events-none" />
            <span class="font-medium">All channels</span>
          </button>

          <!-- Categories -->
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            :data-cat="cat.id"
            class="flex w-full items-center gap-2.5 rounded-base px-2 py-1.5 text-left text-[13.5px] text-grey-900 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
            :class="{ 'bg-grey-100': cat.id === activeId }"
            @click="openCategory(cat)"
            @keydown.space.prevent="toggleCategory(cat)"
            @keydown.right.prevent="openCategory(cat, true)"
          >
            <span class="flex items-center" @click.stop="toggleCategory(cat)">
              <Checkbox :model-value="categoryState(cat)" tabindex="-1" aria-hidden="true" class="pointer-events-none" />
            </span>
            <span class="flex-1 truncate">{{ cat.label }}</span>
            <span
              v-if="categoryCount(cat) > 0"
              class="rounded-pill bg-grey-200 px-1.5 py-0.5 text-[11px] font-medium text-grey-600"
            >
              {{ categoryCount(cat) }}/{{ cat.instances.length }}
            </span>
            <Icon name="ChevronRight" :size="14" class="text-grey-400" />
          </button>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between gap-2 border-t border-grey-200 bg-grey-100 px-3 py-2">
          <span class="text-xs text-grey-600">{{ selected.size }} channels selected</span>
          <button
            type="button"
            class="text-xs font-semibold text-grey-700 transition-colors hover:text-grey-900 focus:outline-none focus-visible:underline"
            @click="clearAll"
          >
            Clear all
          </button>
        </div>
      </div>

      <!-- Right panel: instances of the active category -->
      <div v-if="activeCategory" ref="rightPanel" class="flex w-[250px] flex-col p-1.5">
        <!-- Select all -->
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-base px-2 py-1.5 text-left text-[13.5px] text-grey-900 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
          @click="toggleCategory(activeCategory)"
          @keydown.left.prevent="focusLeft"
        >
          <Checkbox :model-value="categoryState(activeCategory)" tabindex="-1" aria-hidden="true" class="pointer-events-none" />
          <span class="flex-1 font-medium">Select all</span>
          <span
            v-if="categoryCount(activeCategory) > 0"
            class="rounded-pill bg-grey-200 px-1.5 py-0.5 text-[11px] font-medium text-grey-600"
          >
            {{ categoryCount(activeCategory) }}/{{ activeCategory.instances.length }}
          </span>
        </button>

        <div class="my-1 h-px bg-grey-200" aria-hidden="true" />

        <!-- Instances -->
        <ScrollArea class="max-h-[280px]">
          <button
            v-for="inst in activeCategory.instances"
            :key="inst.id"
            type="button"
            data-instance
            class="flex w-full items-center gap-2.5 rounded-base px-2 py-1.5 text-left text-[13.5px] text-grey-900 transition-colors hover:bg-grey-100 focus:outline-none focus-visible:bg-grey-100"
            @click="toggleInstance(inst.id)"
            @keydown.left.prevent="focusLeft"
          >
            <Checkbox :model-value="isInstanceSelected(inst.id)" tabindex="-1" aria-hidden="true" class="pointer-events-none" />
            <span class="truncate">{{ inst.name }}</span>
          </button>
        </ScrollArea>
      </div>
    </PopoverContent>
  </Popover>
</template>
