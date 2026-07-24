<script setup lang="ts">
/**
 * Icon — loads SVGs from the project's existing icon folders (CLAUDE.md).
 *
 * Sources (kept where they already live, outside src/):
 *   - svg icons/linear/*   (outline, stroke=currentColor)
 *   - svg icons/filled/*   (filled, fill=currentColor)
 *   - sidebar-icons/*      (icon-sidebar-{name}[-filled])
 *
 * Names are fuzzy-matched: case-insensitive, ignoring separators and the
 * decorations 'icon' / 'sidebar' / 'outline' / 'filled'. Colour comes from the
 * surrounding text colour (currentColor) — set it with a text-* utility.
 * Render sizes per design.md §8: 16 / 20 / 32.
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
    variant?: 'linear' | 'filled' | 'sidebar' | 'sidebar-filled'
  }>(),
  { size: 20, variant: 'linear' },
)

// Eagerly inline icons as raw SVG strings. NOTE (flagged): this inlines the
// whole linear set, not just what's used — fine for a single-file prototype,
// but an engineer should switch to on-demand loading for production.
const linear = import.meta.glob('../../svg icons/linear/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const filled = import.meta.glob('../../svg icons/filled/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>
const sidebar = import.meta.glob('../../sidebar-icons/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** Strip decorations + non-alphanumerics for fuzzy matching. */
function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\.svg$/, '')
    .replace(/icon|sidebar|outline/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function buildMap(glob: Record<string, string>, opts: { filledVariant: boolean }) {
  const map: Record<string, string> = {}
  for (const [path, svg] of Object.entries(glob)) {
    const file = path.split('/').pop() ?? ''
    const isFilled = /-filled|filled/i.test(file)
    if (opts.filledVariant !== isFilled) continue
    const key = normalize(file)
    if (key) map[key] = svg
  }
  return map
}

const maps = {
  linear: buildMap(linear, { filledVariant: false }),
  // The svg icons/filled/* folder is entirely filled glyphs (plain names).
  filled: buildMap(filled, { filledVariant: false }),
  sidebar: buildMap(sidebar, { filledVariant: false }),
  'sidebar-filled': buildMap(sidebar, { filledVariant: true }),
}

const svg = computed(() => {
  const map = maps[props.variant]
  const key = normalize(props.name)
  const found = map[key]
  if (!found && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[Icon] no match for "${props.name}" (variant: ${props.variant})`)
  }
  return found ?? ''
})
</script>

<template>
  <span
    class="icon-host inline-flex shrink-0 items-center justify-center"
    :style="{ width: `${size}px`, height: `${size}px` }"
    v-html="svg"
  />
</template>

<style scoped>
.icon-host :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
