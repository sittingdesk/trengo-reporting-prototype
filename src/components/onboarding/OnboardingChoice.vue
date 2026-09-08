<script setup lang="ts">
// OnboardingChoice — the existing-customer welcome step.
//
// A reversible recommendation: start with the reports we recommend, or rebuild the
// familiar ones. Both cards are driven by STARTING_SETS — the same source the New
// dashboard dialog reads — so the two surfaces can't drift, and the promise below
// ("both stay available") is true by construction rather than by good intentions.
//
// "Decide later" starts empty, which is why WelcomeEmpty still exists.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/Icon.vue'
import { useWorkspace } from '@/composables/useWorkspace'
import { getStartingSet } from '@/config/startingSets'
import { getTemplate } from '@/config/templates'

const router = useRouter()
const { chooseStart, dashboardPath } = useWorkspace()

/** The report names a set would create, for the chips on each card. */
function reportNames(setId: string): string[] {
  return (getStartingSet(setId)?.templateIds ?? []).map((id) => getTemplate(id)?.name ?? id)
}
const newNames = computed(() => reportNames('recommended'))
const oldNames = computed(() => reportNames('current-reports'))

function choose(kind: 'new' | 'old' | 'later') {
  const dashboard = chooseStart(kind)
  router.push(dashboard ? dashboardPath(dashboard.id) : '/welcome')
}
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center px-6 py-10">
    <div class="w-full max-w-3xl">
      <!-- Heading -->
      <div class="mb-6 text-center">
        <span class="mx-auto mb-3 flex size-11 items-center justify-center rounded-circle bg-leaf-100 text-leaf-600">
          <Icon name="Apperture" :size="22" />
        </span>
        <h1 class="text-xl font-bold text-grey-900">Reporting has a new setup</h1>
        <p class="mx-auto mt-1 max-w-md text-sm text-grey-600">
          Your reports now live together on a dashboard. Pick which ones to start with —
          you can change this anytime.
        </p>
      </div>

      <!-- Two option cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- The recommended set -->
        <article class="flex flex-col rounded-xl border-2 border-leaf-500 bg-white p-5">
          <div class="mb-1 flex items-center gap-2">
            <h2 class="text-base font-semibold text-grey-900">Try the new reports</h2>
            <Badge variant="recommended">Recommended</Badge>
          </div>
          <p class="mb-3 text-sm text-grey-600">
            One dashboard, five reports — built around health, insight, operations and
            automation.
          </p>
          <ul class="mb-4 flex flex-wrap gap-1.5">
            <li
              v-for="name in newNames"
              :key="name"
              class="rounded-pill bg-grey-100 px-2 py-0.5 text-xs font-medium text-grey-700"
            >
              {{ name }}
            </li>
          </ul>
          <Button variant="default" class="mt-auto w-full" @click="choose('new')">
            Start with the new reports
          </Button>
        </article>

        <!-- The legacy set -->
        <article class="flex flex-col rounded-xl border border-grey-300 bg-white p-5">
          <h2 class="mb-1 text-base font-semibold text-grey-900">Keep my current reports</h2>
          <p class="mb-3 text-sm text-grey-600">
            Your familiar reports, rebuilt in the new system so nothing feels lost.
          </p>
          <ul class="mb-4 flex flex-wrap gap-1.5">
            <li
              v-for="name in oldNames"
              :key="name"
              class="rounded-pill bg-grey-100 px-2 py-0.5 text-xs font-medium text-grey-700"
            >
              {{ name }}
            </li>
          </ul>
          <Button variant="outline" class="mt-auto w-full" @click="choose('old')">
            Recreate my reports
          </Button>
        </article>
      </div>

      <!-- Decide later + reassurance. Both sets are permanent options in the dialog, so
           this isn't a one-way door — worth saying, because it's the whole reason the
           choice can be offered at all. -->
      <div class="mt-5 text-center">
        <Button variant="ghost" size="sm" @click="choose('later')">Decide later</Button>
        <p class="mt-1 text-xs text-grey-600">
          Whichever you pick, both are always available from + New dashboard.
        </p>
      </div>
    </div>
  </div>
</template>
