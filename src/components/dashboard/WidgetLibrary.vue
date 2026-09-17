<script setup lang="ts">
// WidgetLibrary — the panel you add widgets from.
//
// A right-hand panel rather than a modal, and NON-MODAL: no scrim, no focus trap, the
// report stays visible and clickable behind it. That's the whole argument for the shape.
// Adding a widget is something you do four or five times in a row, and the two questions
// you're actually answering are "do I already have this" and "did that land where I
// expected" — both answered by looking at the report, which a modal covers up. It also
// means you can remove a card without closing the panel first.
//
// Hand-rolled rather than built on reka's Dialog: a non-modal dialog dismisses on outside
// pointer-down, which is exactly the click we want to let through to the report, so the
// primitive's behaviour would have to be switched off piece by piece. What's left that it
// would give us — Escape and a portal — is one listener and `position: fixed`.
//
// Mounted once in App.vue, driven by `widgetLibrary` state, so any trigger can open it.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from '@/components/Icon.vue'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { useWorkspace } from '@/composables/useWorkspace'
import { useSettings } from '@/composables/useSettings'
import { isMetricWidget } from '@/config/templates'
import { getMetric } from '@/data/metrics'
import { METRIC_SUBJECTS, SHAPE_BY_RESULT_TYPE, sizeLabel } from '@/data/metricGroups'
import { defaultSpanForMetric } from '@/lib/widgetLayout'

const { widgetLibrary, closeWidgetLibrary, addWidget, getDashboard } = useWorkspace()
const { slaEnabled } = useSettings()

const open = computed(() => widgetLibrary.value !== null)
const dashboard = computed(() =>
  widgetLibrary.value ? getDashboard(widgetLibrary.value.dashboardId) : undefined,
)
const report = computed(() =>
  dashboard.value?.reports.find((r) => r.id === widgetLibrary.value?.reportId),
)

/** Metric ids already on the target report — what the "Added" state reads. */
const present = computed(
  () =>
    new Set(
      (report.value?.widgets ?? [])
        .filter(isMetricWidget)
        .map((w) => w.metricId),
    ),
)

/**
 * The offerable catalogue, by subject.
 *
 * SLA-gated metrics are omitted while the workspace has no SLA policy — the same rule the
 * grid applies (WidgetGrid's capability gate). Showing them would let you add a widget
 * that then doesn't render: click, nothing appears, click again, two invisible widgets.
 */
const sections = computed(() =>
  METRIC_SUBJECTS.map((subject) => ({
    id: subject.id,
    label: subject.label,
    rows: subject.metricIds
      .map((id) => getMetric(id))
      .filter((m) => !!m)
      .filter((m) => m!.requires !== 'sla' || slaEnabled.value)
      .map((m) => {
        const metric = m!
        const shape = SHAPE_BY_RESULT_TYPE[metric.resultType] ?? {
          label: 'Widget',
          icon: 'Grid',
        }
        return {
          id: metric.id,
          label: metric.label,
          description: metric.caveat ?? '',
          icon: shape.icon,
          // The size can't lie: it comes from the same span map the grid renders with.
          meta: `${shape.label} · ${sizeLabel(defaultSpanForMetric(metric.id))}`,
          added: present.value.has(metric.id),
        }
      }),
  })).filter((s) => s.rows.length > 0),
)

/** What a screen reader hears after an add — the only feedback that isn't visual. */
const announcement = ref('')

function add(metricId: string) {
  const target = widgetLibrary.value
  if (!target) return
  const widget = addWidget(target.dashboardId, target.reportId, metricId)
  if (!widget) return
  announcement.value = `${getMetric(metricId)?.label} added to ${report.value?.name}.`
  flash(widget.uid)
}

/**
 * Bring the new card into view and flash it.
 *
 * The panel doesn't own the cards, so it finds the new one by the uid the grid renders as
 * a data attribute. The alternative — a "just added" id in shared state plus a watcher in
 * the grid — is more machinery for a highlight that lasts a second. `shadow-focus` is the
 * leaf ring already used for focus, so no new token and no keyframes (this project has no
 * animation utilities at all).
 */
function flash(uid?: string) {
  if (!uid) return
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`[data-widget-uid="${uid}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    el.classList.add('shadow-focus')
    window.setTimeout(() => el.classList.remove('shadow-focus'), 1200)
  })
}

// Escape closes the panel. Only while it's open, and only if nothing is stacked above it —
// a confirm dialog opened from a card should take the key first.
//
// `preventDefault` is how this hands off: edit mode ALSO exits on Escape, and both
// listeners sit on window, so which one runs first depends on mount order — which changes,
// because the route component remounts on every navigation while this panel doesn't. One
// press was closing the panel and leaving the mode. Marking the event handled makes the
// order irrelevant (and DashboardView's own guard covers the mirror case).
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape' || !open.value) return
  if (document.querySelector('[role="alertdialog"], [role="dialog"][data-state="open"]')) return
  closeWidgetLibrary()
  e.preventDefault()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// A stale announcement read out on reopen would be a lie about what just happened.
watch(open, (isOpen) => {
  if (!isOpen) announcement.value = ''
})
</script>

<template>
  <!-- Slide from the right at design.md §6.1's documented `transform 0.2s`. A Vue
       <Transition> rather than a utility class: `animate-in` / `animate-out` are
       referenced all over this project's shadcn wrappers and emit nothing — there is no
       animation plugin and no keyframes in index.css. -->
  <Transition
    enter-active-class="transition-transform duration-200"
    leave-active-class="transition-transform duration-200"
    enter-from-class="translate-x-full"
    leave-to-class="translate-x-full"
  >
    <aside
      v-if="open && report"
      class="fixed right-0 top-0 z-40 flex h-full w-[400px] flex-col border-l border-grey-300 bg-white shadow-500"
      role="region"
      aria-label="Widget library"
    >
      <!-- The Analytics sidebar's heading row, verbatim: `px-4 pb-2 pt-5`, an 18/700
           title, and a 28px quiet icon button on the right where that sidebar puts its
           "+". Two panels either side of the same page should not introduce each other
           differently. -->
      <div class="flex items-center justify-between px-4 pb-2 pt-5">
        <h2 class="text-lg font-bold text-grey-900">Add a widget</h2>
        <button
          type="button"
          aria-label="Close widget library"
          class="flex size-7 shrink-0 items-center justify-center rounded-base text-grey-600 transition-colors hover:bg-grey-200 hover:text-grey-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @click="closeWidgetLibrary()"
        >
          <Icon name="Cross" :size="20" />
        </button>
      </div>
      <!-- Names the target explicitly. The panel outlives a report switch, so leaving
           this implicit is how you add to the report you just navigated away from. -->
      <p class="truncate px-4 pb-2 text-sm text-grey-600">
        Adding to <span class="font-medium text-grey-800">{{ report.name }}</span>
      </p>

      <!-- The sidebar's list container, down to the scrollbar: `gap-2 px-2 py-1` with
           `overflow-y-auto scroll-thin`, rather than the ScrollArea component. Same
           spacing rhythm, same thin scrollbar — the two lists scroll identically. -->
      <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 py-1 pb-4 scroll-thin">
          <section v-for="section in sections" :key="section.id">
            <!-- Sticky so the subject stays legible while you scan a long group (Calls is
                 ten rows). White ground, or the rows would show through it. -->
            <!-- The sidebar separates its two groups with a gap and no heading, on the
                 grounds that two labels organised less than they labelled. Seven subjects
                 is the case that flips it back: without a heading you can't tell where
                 Calls ends and Deals starts. Sticky, so it survives a long group. -->
            <h3
              class="sticky top-0 z-[1] bg-white px-2.5 pb-1 pt-2 text-xs font-semibold text-grey-600"
            >
              {{ section.label }}
            </h3>
            <!-- A row is two lines and a control, not four lines of prose.
                 The definition used to sit in the row as two clamped lines, which made
                 every row four lines tall and the list unscannable — you read paragraphs
                 to find a widget you already knew the name of. It moves behind the ⓘ,
                 which is where this app already keeps definitions (the same caveat, the
                 same Tooltip, on every metric card's header).
                 What replaces it as the second line is the SHAPE — "Number", "Bar chart ·
                 full width". That's the thing you can't infer from the title and the thing
                 you're actually choosing between when two rows measure the same subject.
                 The ⓘ is a SIBLING of the row, not a child: a button inside a button is
                 invalid markup and a coin-toss click target. Absolutely positioned over
                 the row's trailing edge, with `pr-11` reserving its width so no title can
                 run underneath it — the same arrangement the report pills use for their ×. -->
            <span v-for="row in section.rows" :key="row.id" class="relative block">
              <!-- The Analytics sidebar's row, unchanged: `flex items-center gap-2
                   rounded-base px-2.5 py-2`, `hover:bg-grey-200`, and a name-over-subtitle
                   stack in 14/500 over 12/400. The one addition is the leading icon —
                   a dashboard row has nothing to distinguish it but its name, where a
                   widget row has a shape worth showing. -->
              <button
                type="button"
                :disabled="row.added"
                :aria-label="row.added ? `${row.label} — already added` : `Add ${row.label}`"
                class="flex w-full items-center gap-2 rounded-base py-2 pl-2.5 pr-9 text-left transition-colors focus:outline-none focus-visible:shadow-focus-sm enabled:hover:bg-grey-200 disabled:cursor-default"
                @click="add(row.id)"
              >
                <span
                  class="flex size-8 shrink-0 items-center justify-center rounded-base transition-colors"
                  :class="row.added ? 'bg-grey-100 text-grey-400' : 'bg-grey-200 text-grey-700'"
                >
                  <Icon :name="row.icon" :size="20" />
                </span>
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span class="flex items-center gap-2">
                    <span
                      class="truncate text-sm font-medium"
                      :class="row.added ? 'text-grey-600' : 'text-grey-700'"
                    >{{ row.label }}</span>
                    <Badge v-if="row.added" variant="muted">Added</Badge>
                  </span>
                  <span class="truncate text-xs text-grey-600">{{ row.meta }}</span>
                </span>
              </button>
              <!-- Always visible, never hover-only: it is the ONLY route to the
                   definition, and a control you have to discover by hovering is no control
                   at all on a touch screen. Quiet enough (grey-400 at 16px) to read as
                   texture until you want it. -->
              <Tooltip :text="row.description">
                <button
                  type="button"
                  class="absolute right-2.5 top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-grey-600 transition-colors hover:bg-grey-300 hover:text-grey-900 focus:outline-none focus-visible:shadow-focus-sm"
                  :aria-label="`What ${row.label} measures`"
                >
                  <Icon name="Info" :size="16" />
                </button>
              </Tooltip>
            </span>
          </section>
      </div>

      <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
    </aside>
  </Transition>
</template>
