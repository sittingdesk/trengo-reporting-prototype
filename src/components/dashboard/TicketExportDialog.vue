<script setup lang="ts">
// TicketExportDialog — the export starting point for tickets (agreed 2026-11-10, Jeff /
// Deborah / Yev): "clean CSV output users can use externally, not clever display".
//
// Export only, on purpose. The requirements vision asks for "easier extraction" and a move
// "from a Logger to an Analyzer", so Analytics doesn't get V2's browsable ticket table. What
// it keeps is the link from a number to its tickets: opened from a card, it starts on exactly
// the card's number, and three example rows show what the file looks like.
//
// Status: a multi-select (V2 let you export Open + Assigned together), pre-set from a card's
// rule. Whether V2's status filters work on the new endpoints is still being checked (Yevhen /
// Andreas) — not shown in the UI; it's an open question for the team, not the user.
//
// Copy and columns live in src/data/ticketExport.ts; rows come from the mock.
import { computed, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Icon from '@/components/Icon.vue'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'vue-sonner'
import DateRangeFilter from '@/components/layout/filters/DateRangeFilter.vue'
import ChannelFilter from '@/components/layout/filters/ChannelFilter.vue'
import SelectFilter from '@/components/layout/filters/SelectFilter.vue'
import { useTicketExport } from '@/composables/useTicketExport'
import { useFilters, createLocalFilters, type FilterSource } from '@/composables/useFilters'
import { useSettings } from '@/composables/useSettings'
import {
  ticketRows,
  ticketCountFor,
  ticketStatusSplit,
  metricValue,
  filterSignature,
  type TicketRow,
  type TicketStatusCounts,
} from '@/lib/mock'
import { exportTicketsCSV } from '@/lib/csvExport'
import { fmtCount, fmtDuration } from '@/lib/format'
import { getMetric } from '@/data/metrics'
import { CHANNEL_INSTANCE_IDS } from '@/data/channelData'
import { TEAMS } from '@/data/filters'
import {
  TICKET_EXPORT as COPY,
  TICKET_COLUMNS,
  TICKET_STATUSES,
  MOCK_LABELS,
  MAX_EXPORT_ROWS,
  EXAMPLE_TICKET_ROWS,
  BACKGROUND_EXPORT_FROM,
  BACKGROUND_PREP_MS,
  prepTimeMs,
} from '@/data/ticketExport'

const { ticketExport, closeTicketExport, returnFocusTarget } = useTicketExport()
const { showEmptyData } = useSettings()
const page = useFilters()

const scope = computed(() => ticketExport.scope)

// ONE export builder, two ways in (checked against Zendesk, Freshdesk, Intercom, 2026-11-12).
// It always has its own filters, like Freshdesk's and Intercom's export: they START from the
// page's filters and then change only the export. Copied once on open, so there are never two
// live layers of the same filter — Freshdesk's own help tells users to clear the list's date
// filter because it silently limits the export.
// From a CARD the start also carries the card's rule (Open tickets → Status: Open), so it opens
// on exactly the card's number; change a filter and the count follows the filters, which the
// chips then show. (First built locked, Zendesk drill-in style; Jeff wanted the filters there
// too, 2026-11-12.)
const local = createLocalFilters()
/** Statuses ticked. None ticked = all, like every other filter here. */
const statusSel = ref<string[]>([])
/** Tickets judged on their CLOSE date (Created vs closed → closed): all closed by definition,
 *  so no status choice — and a different count, the card's Closed line. */
const closedScope = computed(() => scope.value?.dateRule === 'closed')
watch(
  () => ticketExport.open,
  (open) => {
    if (!open) return
    local.reset(page)
    const st = scope.value?.status
    statusSel.value = st && !closedScope.value ? [st] : []
  },
)
function toggleStatus(id: string) {
  statusSel.value = statusSel.value.includes(id)
    ? statusSel.value.filter((x) => x !== id)
    : [...statusSel.value, id]
}

/** The filters this export runs on — always its own copy. */
const f = computed<FilterSource>(() => local)

/** Selected channels, or [] for all — the same normalisation the mock's signature uses. */
const channelSel = computed(() =>
  f.value.channelIds.value.length === CHANNEL_INSTANCE_IDS.length ? [] : f.value.channelIds.value,
)
const signature = computed(() =>
  filterSignature(f.value.dateRange.value, f.value.channelIds.value, f.value.teamIds.value),
)

/** Every ticket created in this export's scope, split by status — the same split the
 *  Overview cards show, so ticking Open + Assigned gives what those two cards add up to. */
const split = computed<TicketStatusCounts>(() => {
  const def = getMetric('conversations_and_new_contacts')
  if (!def || showEmptyData.value) return { open: 0, assigned: 0, closed: 0 }
  const total = ticketCountFor(def.id, metricValue(def, signature.value, f.value.dateRange.value)) ?? 0
  return ticketStatusSplit(signature.value, f.value.dateRange.value, total)
})

const statusCounts = computed<TicketStatusCounts>(() => {
  if (!scope.value) return { open: 0, assigned: 0, closed: 0 }
  if (closedScope.value) {
    // Closed in the range = Created vs closed's Closed line, for these filters.
    const def = getMetric('created_vs_closed')
    const closed =
      !def || showEmptyData.value
        ? 0
        : (ticketCountFor(def.id, metricValue(def, signature.value, f.value.dateRange.value), 1) ?? 0)
    return { open: 0, assigned: 0, closed }
  }
  const on = (id: keyof TicketStatusCounts) => !statusSel.value.length || statusSel.value.includes(id)
  return {
    open: on('open') ? split.value.open : 0,
    assigned: on('assigned') ? split.value.assigned : 0,
    closed: on('closed') ? split.value.closed : 0,
  }
})
const count = computed(() => statusCounts.value.open + statusCounts.value.assigned + statusCounts.value.closed)
const overLimit = computed(() => count.value > MAX_EXPORT_ROWS)

/** Under the chips: where the filters started, and that they only change the export. */
const filtersNote = computed(() =>
  scope.value?.origin === 'card' ? COPY.cardFiltersNote(scope.value.source) : COPY.pageFiltersNote,
)

function rowsFor(counts: TicketStatusCounts): TicketRow[] {
  if (!scope.value) return []
  return ticketRows({
    // Same scope → same file: the page's "all tickets" and the Tickets & new contacts card
    // produce identical rows for identical filters.
    seedKey: `${scope.value.dateRule}|${signature.value}`,
    statusCounts: counts,
    dateRule: scope.value.dateRule,
    dateRange: f.value.dateRange.value,
    channelIds: channelSel.value,
    labels: MOCK_LABELS,
  })
}

const exportLabel = computed(() =>
  count.value === 1 ? COPY.exportOne : COPY.export(fmtCount(count.value)),
)

/** A preview cell as the page would show it: "23 Jun, 21:45", "1h 20m", or "—" for a time
 *  that hasn't happened yet (the file leaves that cell empty). */
function display(r: TicketRow, c: (typeof TICKET_COLUMNS)[number]): string {
  const v = r[c.key]
  if (v === null || v === undefined || (Array.isArray(v) && !v.length)) return '—'
  if (c.kind === 'date' && v instanceof Date) return fmtDate.format(v)
  if (c.kind === 'duration' && typeof v === 'number') return fmtDuration(v)
  return String(v)
}

const fmtDate = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

// --- Loading states ----------------------------------------------------------------------
// Two, by how long the file takes (a prototype simulation of the export endpoint):
// - A few seconds: the Export button shows a Spinner and "Preparing export…"; the modal stays
//   open and closes itself when the download starts.
// - Long (BACKGROUND_EXPORT_FROM and up): the modal closes at once and the export carries on
//   in the background, followed by a toast; the file downloads by itself when it's ready and
//   the toast confirms it — people keep working instead of watching a modal. A download link
//   is never emailed here: the file holds personal data, so it stays inside the signed-in app.
// Closing the modal while the spinner runs hands the export to the background the same way.
const exporting = ref(false)
let pendingToast: string | number | null = null

/** The file is ready: download it straight away — no second Download step to press (Jeff,
 *  2026-11-12) — and turn the toast into a short confirmation that says where it went. */
function readyToast(n: number, download: () => void, id?: string | number) {
  download()
  toast.success(COPY.toastReady(fmtCount(n)), { id, description: COPY.toastReadyHint })
}
function failedToast(id?: string | number) {
  toast.error(COPY.toastFailed, { id, description: COPY.toastFailedHint })
}

function onExport() {
  if (!scope.value || !count.value || overLimit.value || exporting.value) return
  const n = count.value
  // Snapshot now: what downloads is what was on screen when Export was pressed.
  const rows = rowsFor(statusCounts.value)
  const source = scope.value.source
  const meta = {
    channels: channelSel.value.join('+') || 'all',
    teams: f.value.teamIds.value.join('+') || 'all',
    rangeLabel: f.value.dateRangeLabel.value,
  }
  const download = () => exportTicketsCSV(rows, TICKET_COLUMNS, source, meta)

  if (n >= BACKGROUND_EXPORT_FROM) {
    closeTicketExport()
    const id = toast.loading(COPY.toastPreparing(fmtCount(n)), { description: COPY.toastPreparingHint })
    setTimeout(() => {
      try {
        readyToast(n, download, id)
      } catch {
        failedToast(id)
      }
    }, BACKGROUND_PREP_MS)
    return
  }

  const wait = prepTimeMs(n)
  if (!wait) {
    download()
    closeTicketExport()
    return
  }
  exporting.value = true
  setTimeout(() => {
    exporting.value = false
    try {
      if (pendingToast !== null) {
        // Closed while preparing: the toast that took over gets the result.
        readyToast(n, download, pendingToast)
      } else {
        download()
        closeTicketExport()
      }
    } catch {
      failedToast(pendingToast ?? undefined)
    } finally {
      pendingToast = null
    }
  }, wait)
}

// Closing mid-preparation doesn't cancel the export: it moves to a toast.
watch(
  () => ticketExport.open,
  (open) => {
    if (!open && exporting.value && pendingToast === null) {
      pendingToast = toast.loading(COPY.toastPreparing(fmtCount(count.value)), {
        description: COPY.toastPreparingHint,
      })
    }
  },
)

function onOpenChange(open: boolean) {
  if (!open) closeTicketExport()
}
function onCloseFocus(e: Event) {
  const el = returnFocusTarget()
  if (el && document.contains(el)) {
    e.preventDefault()
    el.focus()
  }
}

</script>

<template>
  <Dialog :open="ticketExport.open" @update:open="onOpenChange">
    <DialogContent
      class="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-6xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0"
      close-class="top-3"
      @close-auto-focus="onCloseFocus"
    >
      <!-- Header: the same anatomy as the release modal — title on a 56px row, the close
           button level with it, a grey-200 rule edge to edge. -->
      <div class="flex items-center gap-2 border-b border-grey-200 py-4 pl-6 pr-14">
        <DialogTitle class="text-lg font-bold">{{ COPY.title }}</DialogTitle>
      </div>

      <!-- The body scrolls on a short window; header and footer stay put. -->
      <div class="flex flex-col gap-5 overflow-y-auto px-6 pb-6 pt-5">
        <!-- The export's own filters, starting from the page's (and, from a card, the card's
             rule). The same chips as the page header, so nothing new to learn; they change
             only this export. The count lives on the Export button. -->
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <DateRangeFilter :source="local" />
            <ChannelFilter :source="local" />
            <SelectFilter
              label="Team"
              icon="Users"
              :options="TEAMS"
              :selected-ids="local.teamIds.value"
              @toggle="local.toggleTeam"
              @clear="local.clearTeams"
            />
            <SelectFilter
              v-if="!closedScope"
              label="Status"
              icon="CheckCircle"
              :options="TICKET_STATUSES"
              :selected-ids="statusSel"
              show-names
              @toggle="toggleStatus"
              @clear="statusSel = []"
            />
          </div>
          <!-- Not shown (Jeff, 2026-11-12: no need to share it), but kept for screen readers as
               the dialog's description, so it's still announced where the filters started. -->
          <DialogDescription class="sr-only">{{ filtersNote }}</DialogDescription>
        </div>

        <!-- Example rows: what the file looks like, not the customer's tickets (see
             EXAMPLE_TICKET_ROWS). Fixed, so they don't follow the filters; the count on the
             Export button does. Not a table to browse — no sorting, no paging. -->
        <section v-if="count > 0" class="flex flex-col gap-2" aria-labelledby="ticket-preview-h">
          <h3 id="ticket-preview-h" class="text-xs font-semibold text-grey-600">
            {{ COPY.previewHeading }}
          </h3>
          <div class="overflow-x-auto rounded-lg border border-grey-300">
            <table class="w-full text-left text-sm">
              <thead class="bg-grey-100">
                <tr>
                  <th
                    v-for="c in TICKET_COLUMNS"
                    :key="c.key"
                    scope="col"
                    class="whitespace-nowrap px-3 py-2 text-xs font-semibold text-grey-700"
                  >
                    {{ c.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in EXAMPLE_TICKET_ROWS" :key="r.id" class="border-t border-grey-200">
                  <td v-for="c in TICKET_COLUMNS" :key="c.key" class="whitespace-nowrap px-3 py-2 text-grey-700">
                    <!-- Grey for every status: the word carries it, and one colour-coded column
                         would be the only colour coding in the modal. -->
                    <Badge v-if="c.key === 'status'" variant="muted" class="text-grey-700">{{ r.status }}</Badge>
                    <!-- One label and "+N", like V2: a row stays one line tall. The file has them all. -->
                    <span v-else-if="c.key === 'labels' && r.labels.length" class="flex items-center gap-1">
                      <Badge variant="muted" class="font-medium text-grey-700">{{ r.labels[0] }}</Badge>
                      <Badge v-if="r.labels.length > 1" variant="muted" class="font-medium text-grey-700">+{{ r.labels.length - 1 }}</Badge>
                    </span>
                    <span v-else :class="c.key === 'agent' ? 'text-grey-900' : 'tabular-nums'">{{ display(r, c) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Nothing in scope: say so, and the export stays off. -->
        <div
          v-else
          class="flex items-center gap-3 rounded-lg border border-grey-300 bg-grey-100 p-3"
          role="status"
        >
          <Icon name="Info" :size="16" class="shrink-0 text-grey-600" />
          <p class="text-sm font-medium text-grey-700">{{ COPY.empty }}</p>
        </div>

        <!-- The cap, explained BEFORE the click. V2 only said so in an error after it.
             A blue (sky) inline banner: information about what to do next, not an error.
             design.md has no info-banner spec; this uses the sky scale — sky-200 fill,
             sky-400 hairline, sky-700 icon (≈5:1), sky-900 text (AA with room). -->
        <div
          v-if="overLimit"
          class="flex items-center gap-3 rounded-lg border border-sky-400 bg-sky-200 p-3"
          role="status"
        >
          <Icon name="Info" :size="16" class="shrink-0 text-sky-700" />
          <p class="text-sm font-medium text-sky-900">{{ COPY.overLimit(fmtCount(MAX_EXPORT_ROWS)) }}</p>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-grey-200 px-6 py-4">
        <Button variant="ghost" @click="closeTicketExport">{{ COPY.cancel }}</Button>
        <!-- While preparing: disabled so it can't fire twice, but NOT faded — a faded button
             reads as "unavailable", and this one is busy, not off. -->
        <Button
          :disabled="!count || overLimit || exporting"
          :aria-busy="exporting"
          :class="exporting ? 'disabled:opacity-100' : undefined"
          @click="onExport"
        >
          <Spinner v-if="exporting" :size="20" :label="COPY.preparingButton" />
          <Icon v-else name="FileDownload" :size="20" />
          {{ exporting ? COPY.preparingButton : exportLabel }}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
