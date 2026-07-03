<script setup lang="ts">
// RailSidebar — the dark Trengo app icon rail, as a PORTABLE component.
//
// Self-contained on purpose: no Tailwind classes, no project theme, no external
// icons — copy this folder into any Vue 3 project and it renders identically.
// Styling uses scoped CSS with CSS custom properties (hex defaults baked in);
// override the `--rail-*` vars on a parent to re-theme.
import { computed } from 'vue'
import { RAIL_ICONS, type RailIcon } from './railIcons'

const props = withDefaults(
  defineProps<{
    /** Keys (into RAIL_ICONS) for the top navigation group, in order. */
    topItems?: string[]
    /** Keys for the bottom utility group, in order. */
    bottomItems?: string[]
    /** Key of the active item (shows the filled icon variant + dark chip). */
    active?: string
    /** Per-item badge, e.g. { notifications: 11 }. */
    badges?: Record<string, string | number>
    /** Avatar initials; pass null to hide the avatar. */
    initials?: string | null
  }>(),
  {
    topItems: () => ['inbox', 'ai', 'broadcasting', 'contacts', 'boards', 'reports', 'settings'],
    bottomItems: () => ['calls', 'help', 'notifications'],
    active: 'reports',
    badges: () => ({ notifications: 11 }),
    initials: 'JV',
  },
)

const emit = defineEmits<{
  (e: 'select', key: string): void
  (e: 'avatar-click'): void
}>()

const top = computed(() => props.topItems.map((k) => RAIL_ICONS[k]).filter(Boolean))
const bottom = computed(() => props.bottomItems.map((k) => RAIL_ICONS[k]).filter(Boolean))

// Show the filled icon when active (falls back to outline if no filled variant).
function iconFor(item: RailIcon, isActive: boolean) {
  return isActive && item.filled ? item.filled : item.linear
}
</script>

<template>
  <aside class="rail">
    <!-- Top: primary navigation -->
    <nav class="rail-group">
      <button
        v-for="item in top"
        :key="item.key"
        type="button"
        :title="item.label"
        class="rail-item"
        :class="{ 'is-active': item.key === active }"
        @click="emit('select', item.key)"
        v-html="iconFor(item, item.key === active)"
      />
    </nav>

    <!-- Bottom: utilities + avatar -->
    <div class="rail-group">
      <button
        v-for="item in bottom"
        :key="item.key"
        type="button"
        :title="item.label"
        class="rail-item"
        :class="{ 'is-active': item.key === active }"
        @click="emit('select', item.key)"
      >
        <span v-html="iconFor(item, item.key === active)" />
        <span v-if="badges[item.key] !== undefined" class="rail-badge">{{ badges[item.key] }}</span>
      </button>

      <button
        v-if="initials"
        type="button"
        title="Profile"
        class="rail-avatar"
        @click="emit('avatar-click')"
      >
        {{ initials }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  width: 72px;
  padding: 12px;
  box-sizing: border-box;
  background: var(--rail-bg, #111213);
}

.rail-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.rail-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--rail-item, #c6c9cd);
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
}
.rail-item:hover {
  background: var(--rail-item-hover-bg, #292c2e);
}
.rail-item.is-active {
  background: var(--rail-active-bg, #4d5256);
  color: var(--rail-active, #ffffff);
}
.rail-item :deep(svg) {
  width: 24px;
  height: 24px;
  display: block;
}

.rail-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  min-width: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--rail-badge-bg, #e8374c);
  color: #ffffff;
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
}

.rail-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-top: 4px;
  border: none;
  border-radius: 999px;
  background: var(--rail-avatar-bg, #249888);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 0 0 2px var(--rail-avatar-ring, #4d5256);
  transition: box-shadow 0.12s;
}
.rail-avatar:hover {
  box-shadow: 0 0 0 2px var(--rail-avatar-ring-hover, #c6c9cd);
}
</style>
