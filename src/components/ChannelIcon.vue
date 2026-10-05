<script setup lang="ts">
/**
 * ChannelIcon — the brand mark for a channel type (WhatsApp, Email, Voice…).
 *
 * Separate from `Icon.vue` on purpose. That component inlines SVG and colours it through
 * `currentColor`; these are full-colour brand marks drawn by Jeff in Figma
 * (`svg icons/channels/`, 16×16, glyph 14.4px), and they must keep their own colours.
 *
 * Rendered as an `<img>` with a data URI rather than inlined, for two reasons:
 *  - The files carry gradient and mask ids (`paint0_linear_16672_2205`). Inline the same
 *    SVG twelve times — one per table row — and the page has twelve copies of one id;
 *    `url(#…)` then resolves to whichever is first, and the marks break the moment that
 *    first copy scrolls out, unmounts or is hidden. An `<img>` gives each its own document.
 *  - An `<img>` never executes anything inside the SVG, so a file dropped into the folder
 *    later can't run script in the page. These ten were checked and are paths only.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ type: string; size?: number }>(), { size: 16 })

const files = import.meta.glob('../../svg icons/channels/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const SRC: Record<string, string> = {}
for (const [path, svg] of Object.entries(files)) {
  const key = (path.split('/').pop() ?? '').replace(/\.svg$/, '')
  SRC[key] = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const src = computed(() => {
  const found = SRC[props.type]
  if (!found && import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[ChannelIcon] no mark for "${props.type}"`)
  }
  return found
})
</script>

<template>
  <!-- alt="" — decorative here: the caller always prints the channel type as text for
       assistive tech, so announcing the image as well would say it twice. -->
  <img v-if="src" :src="src" :width="size" :height="size" alt="" class="shrink-0" />
</template>
