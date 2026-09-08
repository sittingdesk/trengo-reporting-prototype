<script setup lang="ts">
// InlineEditName — a heading you rename in place.
//
// Rest is plain text. Hover reveals a rounded outline and a "Click to rename" tooltip;
// clicking swaps in an input carrying the leaf focus ring. Enter or blur commits, Escape
// reverts.
//
// Two things it has to get right:
//
// The resting element carries a TRANSPARENT border the same width as the hover one, so
// revealing the outline can't shift the text by a pixel. Same padding on both states, so
// the swap to an input doesn't move the text either.
//
// An empty name reverts instead of committing. A nameless dashboard would leave a blank
// row in the sidebar with no way to click back into it and fix the name.
import { nextTick, ref, watch } from 'vue'
import { Tooltip } from '@/components/ui/tooltip'

const props = withDefaults(
  defineProps<{ name: string; label?: string; editable?: boolean }>(),
  { editable: true },
)
const emit = defineEmits<{ rename: [name: string] }>()

const editing = ref(false)
const draft = ref(props.name)
const input = ref<HTMLInputElement | null>(null)

// Follow the name when it changes underneath us — switching dashboards, or a reset.
watch(
  () => props.name,
  (n) => {
    if (!editing.value) draft.value = n
  },
)

async function start() {
  draft.value = props.name
  editing.value = true
  await nextTick()
  input.value?.focus()
  // Caret at the end, not select-all: renaming is usually a tweak to the existing name
  // rather than a replacement, which is what the reference recording shows too.
  const end = draft.value.length
  input.value?.setSelectionRange(end, end)
}

function commit() {
  if (!editing.value) return
  editing.value = false
  const next = draft.value.trim()
  if (next && next !== props.name) emit('rename', next)
  else draft.value = props.name
}

function cancel() {
  editing.value = false
  draft.value = props.name
}
</script>

<template>
  <!-- -ml-2 cancels the horizontal padding so the text still lines up with whatever sits
       under it; the outline is what extends past the text, exactly as in the reference. -->
  <!-- Not editable: plain text, no button, no hover outline, no tooltip. A control that
       looks interactive and then refuses is worse than no control — and the copy route is
       New dashboard → Trengo recommended, not this heading. -->
  <span v-if="!editable" class="block max-w-full truncate text-h3 font-bold text-grey-900">
    {{ name }}
  </span>
  <input
    v-else-if="editing"
    ref="input"
    v-model="draft"
    type="text"
    :aria-label="label ?? 'Name'"
    class="-ml-2 min-w-[6ch] max-w-full rounded-md border border-leaf-500 bg-white px-2 py-0.5 text-h3 font-bold text-grey-900 shadow-focus outline-none field-sizing-content"
    @keydown.enter.prevent="commit()"
    @keydown.esc.prevent="cancel()"
    @blur="commit()"
  />
  <Tooltip v-else text="Click to rename">
    <button
      type="button"
      class="-ml-2 inline-block max-w-full truncate rounded-md border border-transparent px-2 py-0.5 text-left text-h3 font-bold text-grey-900 transition-colors hover:border-grey-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      @click="start()"
    >
      {{ name }}
    </button>
  </Tooltip>
</template>
