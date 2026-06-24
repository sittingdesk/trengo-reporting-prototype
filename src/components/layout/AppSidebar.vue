<script setup lang="ts">
// AppSidebar — the Trengo app icon rail (ported from the product's "layer 1" rail).
// 72px dark column: top nav group + bottom utilities (calls, help, notifications,
// avatar). Each item shows an outline icon, swapping to a filled icon when active.
// In this prototype the rail is app-level navigation and mostly decorative —
// "Reports" is marked active because that's the section this app lives in.
//
// The icon SVGs live in railIcons.ts (extracted from the source, colours set to
// currentColor) so the button's text colour drives them: grey-400 idle, white active.
import { RAIL_ICONS } from './railIcons'

// Which rail item is active in this app.
const ACTIVE_KEY = 'reports'

// Order of the top + bottom groups (keys map into RAIL_ICONS).
const topKeys = ['inbox', 'ai', 'broadcasting', 'contacts', 'boards', 'reports', 'settings']
const bottomKeys = ['calls', 'help', 'notifications']

const top = topKeys.map((k) => RAIL_ICONS[k])
const bottom = bottomKeys.map((k) => RAIL_ICONS[k])

// Show the filled icon when active (falls back to outline if no filled variant).
function iconFor(item: (typeof top)[number], active: boolean) {
  return active && item.filled ? item.filled : item.linear
}
</script>

<template>
  <aside class="flex w-[72px] shrink-0 flex-col items-center justify-between bg-grey-900 p-3">
    <!-- Top: primary navigation -->
    <nav class="flex w-full flex-col items-center gap-1">
      <button
        v-for="item in top"
        :key="item.key"
        :title="item.label"
        class="flex size-12 items-center justify-center rounded-lg transition-colors [&_svg]:size-6"
        :class="
          item.key === ACTIVE_KEY
            ? 'bg-grey-700 text-white'
            : 'text-grey-400 hover:bg-grey-800'
        "
        v-html="iconFor(item, item.key === ACTIVE_KEY)"
      />
    </nav>

    <!-- Bottom: utilities + avatar -->
    <div class="flex w-full flex-col items-center gap-1">
      <button
        v-for="item in bottom"
        :key="item.key"
        :title="item.label"
        class="relative flex size-12 items-center justify-center rounded-lg text-grey-400 transition-colors hover:bg-grey-800 [&_svg]:size-6"
      >
        <span v-html="item.linear" />
        <!-- Notification count badge -->
        <span
          v-if="item.key === 'notifications'"
          class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-semibold leading-none text-white"
        >
          11
        </span>
      </button>

      <!-- Profile avatar — initials on a leaf circle -->
      <button
        title="Profile"
        class="mt-1 flex size-9 items-center justify-center rounded-circle bg-leaf-500 text-xs font-semibold text-white ring-2 ring-grey-700 transition-shadow hover:ring-grey-400"
      >
        JV
      </button>
    </div>
  </aside>
</template>
