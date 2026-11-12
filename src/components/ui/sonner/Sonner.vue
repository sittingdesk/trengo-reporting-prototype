<script setup lang="ts">
// Sonner — shadcn-vue's toast container (vue-sonner), themed with our tokens: white surface,
// grey-300 hairline, grey-900 text, the same card shadow as popovers. Mounted ONCE in App.vue;
// anything raises a toast with `toast(...)` from 'vue-sonner'.
import { Toaster as Sonner, type ToasterProps } from 'vue-sonner'
import 'vue-sonner/style.css'

const props = defineProps<ToasterProps>()
</script>

<template>
  <Sonner
    class="toaster group"
    :style="{
      '--normal-bg': 'var(--color-white, #fff)',
      '--normal-text': 'var(--color-grey-900)',
      '--normal-border': 'var(--color-grey-300)',
      '--border-radius': 'var(--radius-lg)',
      fontFamily: 'var(--font-sans)',
    }"
    v-bind="props"
  />
</template>
