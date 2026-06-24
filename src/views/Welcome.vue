<script setup lang="ts">
// Welcome — the no-tabs landing.
// Existing customers who haven't chosen yet see the onboarding step; everyone
// else (new customers who cleared their tabs, or "decide later") sees the generic
// empty state.
import { computed } from 'vue'
import { useWorkspace } from '@/composables/useWorkspace'
import OnboardingChoice from '@/components/onboarding/OnboardingChoice.vue'
import WelcomeEmpty from '@/views/WelcomeEmpty.vue'

const { scenario, needsChoice } = useWorkspace()
const showOnboarding = computed(() => scenario.value === 'existing' && needsChoice.value)
</script>

<template>
  <OnboardingChoice v-if="showOnboarding" />
  <WelcomeEmpty v-else />
</template>
