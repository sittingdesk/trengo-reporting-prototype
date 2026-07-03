<script setup lang="ts">
// App.vue — the overall shell that frames every page.
// Layout, left to right:
//   [ RailSidebar (icon rail) ][ TabsSidebar (dashboards) ][ TopBar + content ]
// The content region swaps per route via <router-view>. The TemplateGallery
// dialog is mounted here at app level so it can open from anywhere.
// RailSidebar is the portable copy-paste component (see components/rail/README.md).
import { RailSidebar } from '@/components/rail'
import TabsSidebar from '@/components/layout/TabsSidebar.vue'
import TopBar from '@/components/layout/TopBar.vue'
import TemplateGallery from '@/components/dashboard/TemplateGallery.vue'
</script>

<template>
  <div class="flex h-full w-full overflow-hidden">
    <!-- Two left sidebars -->
    <RailSidebar active="reports" />
    <TabsSidebar />

    <!-- Top bar + scrollable content -->
    <div class="flex min-w-0 flex-1 flex-col">
      <TopBar />
      <main class="scroll-thin flex-1 overflow-y-auto bg-grey-100">
        <router-view />
      </main>
    </div>

    <!-- App-level template picker (opened from the sidebar / empty state) -->
    <TemplateGallery />
  </div>
</template>
