<script setup lang="ts">
// ConfirmDialog — "are you sure?" for one irreversible action.
//
// One component for every confirm, so the shape of the question is decided once: the
// TITLE names the thing (you clicked a small × on a hover row — the first job is to say
// WHICH one), the DESCRIPTION states what goes with it, and the confirm button repeats
// the verb and the noun rather than saying "OK". A button labelled with its own action
// is the last chance to notice you're on the wrong dialog.
//
// Nothing here decides WHEN to ask — the caller does. Reports with no widgets don't
// prompt at all; see ReportBar.
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

defineProps<{
  open: boolean
  /** Names the thing being removed, e.g. 'Remove “Overview”?' */
  title: string
  /** What goes with it. Always visible — this is the whole point of the dialog. */
  description?: string
  /** Verb + noun, e.g. 'Remove report'. Never 'OK'. */
  confirmLabel: string
}>()

const emit = defineEmits<{ 'update:open': [boolean]; confirm: [] }>()
</script>

<template>
  <AlertDialog :open="open" @update:open="emit('update:open', $event)">
    <AlertDialogContent class="max-w-md gap-0 p-0">
      <div class="p-4">
        <AlertDialogTitle class="text-base">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="description" class="mt-1.5">
          {{ description }}
        </AlertDialogDescription>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-grey-200 p-4 pt-3">
        <AlertDialogCancel as-child>
          <Button variant="outline">Cancel</Button>
        </AlertDialogCancel>
        <!-- Deliberately NOT wrapped in AlertDialogAction. That wrapper closes the
             dialog on click, and its handler runs BEFORE ours — so `update:open` had
             already cleared the caller's pending target by the time `confirm` arrived,
             and the confirm silently did nothing. The caller closes this dialog by
             clearing that target, which it does anyway once it has acted. -->
        <Button variant="destructive" @click="emit('confirm')">{{ confirmLabel }}</Button>
      </div>
    </AlertDialogContent>
  </AlertDialog>
</template>
