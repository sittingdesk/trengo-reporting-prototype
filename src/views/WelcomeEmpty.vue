<script setup lang="ts">
// WelcomeEmpty — the "new customer" empty state.
// Shown when there are no dashboards yet. Prompts the user to create their first
// dashboard, which opens the template gallery.
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/composables/useWorkspace'

const { openNewDashboard, allowNewDashboard } = useWorkspace()
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
    <div class="flex size-12 items-center justify-center rounded-circle bg-grey-200 text-2xl leading-none text-grey-600">
      +
    </div>
    <h2 class="text-base font-semibold text-grey-900">Create your first dashboard</h2>
    <p class="max-w-sm text-sm text-grey-600">
      Pick a template to get started — a ready-made set of widgets you can use right away.
    </p>
    <!-- Same gate as the sidebar: without it you can reach a button that opens a
         dialog you're not allowed to use. -->
    <Button
      v-if="allowNewDashboard"
      variant="default"
      size="default"
      class="mt-1"
      @click="openNewDashboard()"
    >
      Browse templates
    </Button>
  </div>
</template>
