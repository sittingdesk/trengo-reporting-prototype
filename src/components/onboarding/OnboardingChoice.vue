<script setup lang="ts">
// OnboardingChoice — the existing-customer welcome step.
//
// A reversible recommendation: try the new question-led templates (recommended)
// or recreate the familiar reports. Either way both sets stay available later in
// the gallery, so the choice is never destructive. "Decide later" starts empty.
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/Icon.vue'
import { useWorkspace } from '@/composables/useWorkspace'
import {
  QUESTION_LED_TEMPLATE_IDS,
  LEGACY_REPORT_TEMPLATE_IDS,
  getTemplate,
} from '@/config/templates'

const router = useRouter()
const { chooseStart } = useWorkspace()

const newNames = QUESTION_LED_TEMPLATE_IDS.map((id) => getTemplate(id)?.name ?? id)
const oldNames = LEGACY_REPORT_TEMPLATE_IDS.map((id) => getTemplate(id)?.name ?? id)

function choose(kind: 'new' | 'old' | 'later') {
  const tab = chooseStart(kind)
  router.push(tab ? `/d/${tab.id}` : '/welcome')
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
          We've reorganised analytics around the questions you ask most. Pick how you'd like to
          start — you can change this anytime.
        </p>
      </div>

      <!-- Two option cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <!-- Try the new templates (recommended) -->
        <article class="flex flex-col rounded-xl border-2 border-leaf-500 bg-white p-5">
          <div class="mb-1 flex items-center gap-2">
            <h2 class="text-base font-semibold text-grey-900">Try the new templates</h2>
            <Badge variant="recommended">Recommended</Badge>
          </div>
          <p class="mb-3 text-sm text-grey-600">
            Start in the new question-led dashboards — built around health, insight, operations and
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
          <Button variant="default" class="mt-auto w-full rounded-pill" @click="choose('new')">
            Start with new templates
          </Button>
        </article>

        <!-- Keep my current reports -->
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

      <!-- Decide later + reassurance -->
      <div class="mt-5 text-center">
        <Button variant="ghost" size="sm" @click="choose('later')">Decide later</Button>
        <p class="mt-1 text-xs text-grey-600">
          You can add or remove any template later from + New dashboard.
        </p>
      </div>
    </div>
  </div>
</template>
