<script setup lang="ts">
// NewDashboardDialog — "New dashboard".
//
// Offers STARTING SETS, not templates: a name field plus three rows — Trengo
// recommended · My current reports · Start from scratch.
//
// It used to list all nine report templates, which mixed two grains: picking "Overview"
// gave you a dashboard named Overview holding one report named Overview. The nine
// templates are report-shaped, so they belong in "Add report". Here the only question is
// which SET of reports you begin with, and "Start from scratch" is the empty set — which
// is why it can finally be enabled, rather than carrying a "Coming soon" badge while
// picking the empty Automate template did the very same thing.
import { computed, ref, watch } from 'vue'
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
import { Input } from '@/components/ui/input'
import Icon from '@/components/Icon.vue'
import { STARTING_SETS, type StartingSetId } from '@/config/startingSets'
import { useWorkspace } from '@/composables/useWorkspace'

const router = useRouter()
const { newDashboardOpen, createDashboard, closeNewDashboard, dashboardPath } = useWorkspace()

// Per-set leading icon + accent tint (presentation only). Full class strings so
// Tailwind's JIT keeps them — never build a class name from a variable.
const META: Record<StartingSetId, { icon?: string; tint: string }> = {
  recommended: { icon: 'Apperture', tint: 'leaf' },
  'current-reports': { icon: 'Grid', tint: 'sky' },
  // No icon: a literal "+" says "nothing here yet" better than any glyph.
  scratch: { tint: 'grey' },
}
const TINT_CLASS: Record<string, string> = {
  leaf: 'bg-leaf-100 text-leaf-600',
  sky: 'bg-sky-100 text-sky-600',
  grey: 'bg-grey-200 text-grey-700',
}

const selectedId = ref<StartingSetId>('recommended')
const selectedSet = computed(() => STARTING_SETS.find((s) => s.id === selectedId.value))

// The name follows the selected set until the user types — then their name wins, so
// changing your mind about the set never silently overwrites what you wrote.
const name = ref('')
const nameDirty = ref(false)
watch(selectedSet, (s) => {
  if (!nameDirty.value) name.value = s?.defaultName ?? ''
})

// Reset on every open, so a cancelled attempt doesn't leak into the next one.
watch(
  newDashboardOpen,
  (open) => {
    if (!open) return
    selectedId.value = 'recommended'
    nameDirty.value = false
    name.value = STARTING_SETS.find((s) => s.id === 'recommended')?.defaultName ?? ''
  },
  { immediate: true },
)

function onOpenChange(open: boolean) {
  if (!open) closeNewDashboard()
}

function create() {
  // undefined when the active iteration doesn't allow new dashboards — the triggers are
  // hidden in that case, so this is belt-and-braces rather than a reachable path.
  const dashboard = createDashboard(selectedId.value, name.value)
  closeNewDashboard()
  if (dashboard) router.push(dashboardPath(dashboard.id))
}
</script>

<template>
  <Dialog :open="newDashboardOpen" @update:open="onOpenChange">
    <DialogContent class="max-w-lg gap-0 p-0">
      <DialogHeader class="gap-1 p-4 pb-3">
        <div class="flex items-center gap-2.5">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-base bg-grey-100 text-grey-700">
            <Icon name="FilePlus" :size="16" />
          </span>
          <DialogTitle class="text-base">New dashboard</DialogTitle>
        </div>
        <DialogDescription class="text-xs">
          Name it, then choose which reports to start with. You can add more later.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-3 border-t border-grey-200 px-4 py-3">
        <!-- Name. A dashboard is a container the user sees in the sidebar from now on,
             so it gets named here rather than inheriting a template's name. -->
        <div class="space-y-1.5">
          <label for="dashboard-name" class="block text-xs font-semibold text-grey-600">
            Dashboard name
          </label>
          <Input
            id="dashboard-name"
            v-model="name"
            placeholder="My dashboard"
            @input="nameDirty = true"
          />
        </div>

        <div class="space-y-1.5" role="radiogroup" aria-label="Start with">
          <div class="text-xs font-semibold text-grey-600">Start with</div>
          <label
            v-for="s in STARTING_SETS"
            :key="s.id"
            class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors"
            :class="
              selectedId === s.id
                ? 'border-leaf-500 bg-leaf-100/40'
                : 'border-grey-300 bg-white hover:bg-grey-100'
            "
          >
            <input
              type="radio"
              name="starting-set"
              class="sr-only"
              :checked="selectedId === s.id"
              @change="selectedId = s.id"
            />
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-base"
              :class="TINT_CLASS[META[s.id].tint]"
            >
              <Icon v-if="META[s.id].icon" :name="META[s.id].icon!" :size="16" />
              <span v-else class="text-base leading-none">+</span>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="truncate text-sm font-semibold text-grey-900">{{ s.name }}</span>
                <Badge v-if="s.recommended" variant="recommended">Recommended</Badge>
              </div>
              <p class="truncate text-xs text-grey-600">{{ s.description }}</p>
            </div>
            <span
              class="flex size-4 shrink-0 items-center justify-center rounded-circle border"
              :class="selectedId === s.id ? 'border-leaf-500' : 'border-grey-300'"
            >
              <span v-if="selectedId === s.id" class="size-2 rounded-circle bg-leaf-500" />
            </span>
          </label>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-grey-200 p-4 pt-3">
        <Button variant="outline" @click="closeNewDashboard()">Cancel</Button>
        <Button variant="default" @click="create()">Create dashboard</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
