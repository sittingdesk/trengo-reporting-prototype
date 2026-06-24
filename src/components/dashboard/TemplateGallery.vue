<script setup lang="ts">
// TemplateGallery — the "New dashboard" picker dialog.
//
// Compact, list-based: a single-select list of rows grouped into "Recommended"
// (the question-led templates) and "Reports" (the detailed ones), with a disabled
// "Start from scratch" row above them. Pick one, then "Create dashboard".
// (The new tab is named after its template; renaming happens on the dashboard.)
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/Icon.vue'
import { TEMPLATES } from '@/config/templates'
import { useWorkspace } from '@/composables/useWorkspace'

const router = useRouter()
const { galleryOpen, createFromTemplate, closeGallery } = useWorkspace()

// Per-template leading icon + accent tint (presentation only).
const META: Record<string, { icon: string; tint: string }> = {
  overview: { icon: 'Apperture', tint: 'leaf' },
  understand: { icon: 'Bulb', tint: 'purple' },
  operate: { icon: 'Activity', tint: 'sky' },
  improve: { icon: 'TrendUp', tint: 'peach' },
  automate: { icon: 'Lightning', tint: 'sun' },
  dashboard: { icon: 'Grid', tint: 'leaf' },
  'workload-management': { icon: 'Layers', tint: 'sky' },
  'agent-performance': { icon: 'Users', tint: 'purple' },
  'customer-satisfaction': { icon: 'Heart', tint: 'peach' },
}
// Full class strings so Tailwind's JIT keeps them (no dynamic class names).
const TINT_CLASS: Record<string, string> = {
  leaf: 'bg-leaf-100 text-leaf-600',
  purple: 'bg-purple-100 text-purple-600',
  sky: 'bg-sky-100 text-sky-600',
  peach: 'bg-peach-100 text-peach-600',
  sun: 'bg-sun-100 text-sun-600',
}
function tintClass(id: string) {
  return TINT_CLASS[META[id]?.tint] ?? TINT_CLASS.leaf
}
function iconName(id: string) {
  return META[id]?.icon ?? 'Grid'
}

const recommended = TEMPLATES.filter((t) => t.recommended)
const reports = TEMPLATES.filter((t) => !t.recommended)

// Selection state — reset to the default (Overview) each time the picker opens.
const selectedId = ref('overview')
watch(
  galleryOpen,
  (open) => {
    if (open) selectedId.value = 'overview'
  },
  { immediate: true },
)

function onOpenChange(open: boolean) {
  if (!open) closeGallery()
}

function create() {
  const tab = createFromTemplate(selectedId.value)
  closeGallery()
  router.push(`/d/${tab.id}`)
}
</script>

<template>
  <Dialog :open="galleryOpen" @update:open="onOpenChange">
    <DialogContent class="max-w-lg gap-0 p-0">
      <!-- Header (compact) -->
      <DialogHeader class="gap-1 p-4 pb-3">
        <div class="flex items-center gap-2.5">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-base bg-grey-100 text-grey-700">
            <Icon name="FilePlus" :size="16" />
          </span>
          <DialogTitle class="text-base">New dashboard</DialogTitle>
        </div>
        <DialogDescription class="text-xs">
          Start from scratch or pick a template to get going.
        </DialogDescription>
      </DialogHeader>

      <!-- Selectable list -->
      <div class="max-h-[56vh] space-y-3 overflow-y-auto border-t border-grey-200 px-4 py-3 scroll-thin" role="radiogroup" aria-label="Template">
        <!-- Start from scratch (deferred) -->
        <div>
          <div class="mb-1.5 text-xs font-semibold text-grey-600">New</div>
          <div
            class="flex cursor-not-allowed items-center gap-2.5 rounded-lg border border-dashed border-grey-300 bg-grey-100 p-2.5 opacity-80"
            title="Custom dashboards are coming in a later release"
            aria-disabled="true"
          >
            <span class="flex size-8 shrink-0 items-center justify-center rounded-base bg-grey-200 text-grey-400 text-base leading-none">+</span>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-grey-700">Start from scratch</div>
              <p class="truncate text-xs text-grey-600">Add widgets one by one and arrange them yourself.</p>
            </div>
            <Badge variant="muted">Coming soon</Badge>
          </div>
        </div>

        <!-- Recommended -->
        <div>
          <div class="mb-1.5 text-xs font-semibold text-grey-600">Recommended</div>
          <div class="space-y-1.5">
            <label
              v-for="t in recommended"
              :key="t.id"
              class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors"
              :class="
                selectedId === t.id
                  ? 'border-leaf-500 bg-leaf-100/40'
                  : 'border-grey-300 bg-white hover:bg-grey-100'
              "
            >
              <input type="radio" name="template" class="sr-only" :checked="selectedId === t.id" @change="selectedId = t.id" />
              <span class="flex size-8 shrink-0 items-center justify-center rounded-base" :class="tintClass(t.id)">
                <Icon :name="iconName(t.id)" :size="16" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate text-sm font-semibold text-grey-900">{{ t.name }}</span>
                  <Badge variant="recommended">Recommended</Badge>
                </div>
                <p class="truncate text-xs text-grey-600">{{ t.description }}</p>
              </div>
              <span
                class="flex size-4 shrink-0 items-center justify-center rounded-circle border"
                :class="selectedId === t.id ? 'border-leaf-500' : 'border-grey-300'"
              >
                <span v-if="selectedId === t.id" class="size-2 rounded-circle bg-leaf-500" />
              </span>
            </label>
          </div>
        </div>

        <!-- Reports -->
        <div>
          <div class="mb-1.5 text-xs font-semibold text-grey-600">Reports</div>
          <div class="space-y-1.5">
            <label
              v-for="t in reports"
              :key="t.id"
              class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors"
              :class="
                selectedId === t.id
                  ? 'border-leaf-500 bg-leaf-100/40'
                  : 'border-grey-300 bg-white hover:bg-grey-100'
              "
            >
              <input type="radio" name="template" class="sr-only" :checked="selectedId === t.id" @change="selectedId = t.id" />
              <span class="flex size-8 shrink-0 items-center justify-center rounded-base" :class="tintClass(t.id)">
                <Icon :name="iconName(t.id)" :size="16" />
              </span>
              <div class="min-w-0 flex-1">
                <span class="block truncate text-sm font-semibold text-grey-900">{{ t.name }}</span>
                <p class="truncate text-xs text-grey-600">{{ t.description }}</p>
              </div>
              <span
                class="flex size-4 shrink-0 items-center justify-center rounded-circle border"
                :class="selectedId === t.id ? 'border-leaf-500' : 'border-grey-300'"
              >
                <span v-if="selectedId === t.id" class="size-2 rounded-circle bg-leaf-500" />
              </span>
            </label>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-2 border-t border-grey-200 p-4 pt-3">
        <Button variant="outline" @click="closeGallery()">Cancel</Button>
        <Button variant="default" @click="create()">Create dashboard</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
