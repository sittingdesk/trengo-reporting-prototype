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
import { computed, nextTick, ref, watch } from 'vue'
import { Tooltip } from '@/components/ui/tooltip'

const props = withDefaults(
  defineProps<{
    name: string
    label?: string
    editable?: boolean
    /** 'heading' = the dashboard title; 'pill' = a report tab in the bar. */
    variant?: 'heading' | 'pill'
    /** Flip true to open the editor from outside — used when a report is created, so you
     *  can type its name immediately instead of hunting for a rename control. */
    autoEdit?: boolean
    /** Pad the trailing edge so a control positioned OVER the pill (the report bar's
     *  remove ×) has room and the label can't run under it. */
    reserveTrailing?: boolean
  }>(),
  { editable: true, variant: 'heading' },
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

// Externally driven start (see `autoEdit`).
watch(
  () => props.autoEdit,
  (on) => {
    if (on && props.editable && !editing.value) start()
  },
  { immediate: true },
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

// One shape per variant, in three states. Written out as full literal strings because
// Tailwind's JIT can't see a class name built from a variable.
//
// ALL THREE states of a variant share one box: same padding, same border width
// (transparent where nothing should show), same negative margin. So nothing moves by a
// pixel when a hover outline appears, when the input swaps in, OR when you switch to a
// dashboard whose name can't be edited at all — that last one is easy to miss, because
// the two states never appear side by side.
const SHAPE = {
  heading: {
    // -ml-2 cancels the LEFT padding only, so the name lines up with whatever sits under
    // it while the outline extends past the text. Not -mx-2: pulling the right side too
    // would let the box reach 8px into the filters beside it. -my-0.5 does the same job
    // vertically: the 2px exists only to reserve room for the outline, and without the
    // negative margin it spent real layout space — which is why every gap around the
    // title measured 3px larger on screen than the number in the CSS.
    rest: '-ml-2 -my-0.5 inline-block max-w-full truncate rounded-md border border-transparent px-2 py-0.5 text-left text-h3 font-bold text-grey-900 transition-colors hover:border-grey-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    // Same box as `rest` — padding, border width, -ml-2 — so a dashboard whose name
    // can't be edited sits at exactly the same height as one whose name can. Without
    // this, switching between Trengo and your own shifted everything below by 6px.
    plain:
      '-ml-2 -my-0.5 block max-w-full truncate rounded-md border border-transparent px-2 py-0.5 text-h3 font-bold text-grey-900',
    edit: '-ml-2 -my-0.5 min-w-[6ch] max-w-full rounded-md border border-leaf-500 bg-white px-2 py-0.5 text-h3 font-bold text-grey-900 shadow-focus outline-none field-sizing-content',
  },
  pill: {
    // The active report's pill: white on a grey-400 hairline, per the Figma bar.
    // shrink-0 on all three, matching INACTIVE_PILL. Without it the ACTIVE pill was the
    // only one in the row allowed to shrink, and it collapsed to 18px under pressure —
    // the one pill that must stay readable was the one that didn't.
    rest: 'inline-flex h-8 max-w-[14rem] shrink-0 items-center truncate rounded-base border border-grey-400 bg-white px-2 text-left text-sm font-medium text-grey-800 shadow-100 transition-colors hover:border-grey-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    plain: 'inline-flex h-8 max-w-[14rem] shrink-0 items-center truncate rounded-base border border-grey-400 bg-white px-2 text-sm font-medium text-grey-800 shadow-100',
    edit: 'h-8 min-w-[6ch] max-w-[14rem] shrink-0 rounded-base border border-leaf-500 bg-white px-2 text-sm font-medium text-grey-800 shadow-focus outline-none field-sizing-content',
  },
} as const

const shape = computed(() => {
  const s = SHAPE[props.variant]
  if (!props.reserveTrailing) return s
  // pr-7 = 28px: a 4px inset, a 20px control, and 4px clearance from the text.
  return { rest: `${s.rest} pr-7`, plain: `${s.plain} pr-7`, edit: `${s.edit} pr-7` }
})
</script>

<template>
  <!-- Not editable: plain text, no button, no hover outline, no tooltip. A control that
       looks interactive and then refuses is worse than no control. -->
  <span v-if="!editable" :class="shape.plain">{{ name }}</span>
  <input
    v-else-if="editing"
    ref="input"
    v-model="draft"
    type="text"
    :aria-label="label ?? 'Name'"
    :class="shape.edit"
    @keydown.enter.prevent="commit()"
    @keydown.esc.prevent="cancel()"
    @blur="commit()"
  />
  <Tooltip v-else text="Click to rename">
    <button type="button" :class="shape.rest" @click="start()">{{ name }}</button>
  </Tooltip>
</template>
