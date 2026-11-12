// Copy and sample data for the Export tickets modal (TicketExportDialog).

import type { TicketRow } from '@/lib/mock'
//
// The modal is the EXPORT STARTING POINT agreed on 2026-11-10 (Jeff / Deborah / Yev): a clean
// CSV of the tickets behind a page or a card, filtered by the page's channel / team / date,
// with no comparison data. Not a ticket browser — the example rows only show what the file looks like.
//
// The columns are deliberately few (data minimisation): no customer names, emails or message
// text. Agent names are the prototype's fictional roster.

/** One export holds at most this many tickets (V2 Ticket details has the same cap). */
export const MAX_EXPORT_ROWS = 100_000

/** From this many tickets the export runs in the background: the modal closes, a toast
 *  follows it, and the file downloads the moment it's ready. Below it, the Export button
 *  shows a spinner for the few seconds it takes. Either way the file downloads by itself
 *  when it's ready — no second Download step (Jeff, 2026-11-12). (Prototype values — real timings come from
 *  the export endpoint.) */
export const BACKGROUND_EXPORT_FROM = 10_000

/** Simulated preparation time, ms: nothing under ~1,000 tickets (a spinner that flashes for a
 *  split second reads slower than none), then up to 3 s in the modal, ~4 s in the background. */
export const prepTimeMs = (n: number) => (n < 1_000 ? 0 : Math.min(3_000, 800 + n / 4))
export const BACKGROUND_PREP_MS = 4_000

/** The modal's "Example rows": three fixed rows that show what the FILE looks like (columns,
 *  date and duration formats, empty cells, several labels), not the customer's own tickets.
 *  Team Lens Daily, 2026-11-12: the preview shows the structure, not real data. So they don't
 *  follow the filters (rows that moved with them would claim to be live data), there is no
 *  preview query, and no real agent or label is displayed. The count on the Export button is
 *  what follows the filters. Together they cover each status, an empty cell (a time that
 *  hasn't happened yet) and a ticket with more than one label. */
export const EXAMPLE_TICKET_ROWS: TicketRow[] = [
  {
    id: 10482931,
    agent: 'Noah Peters',
    status: 'Closed',
    channel: 'Main line',
    channelType: 'Voice',
    created: new Date(Date.UTC(2026, 5, 23, 9, 12)),
    closed: new Date(Date.UTC(2026, 5, 23, 9, 31)),
    firstResponse: 21,
    firstResolution: 1_140,
    messagesSent: 3,
    labels: ['Billing question'],
  },
  {
    id: 10482917,
    agent: 'Mila van Dijk',
    status: 'Assigned',
    channel: 'Support',
    channelType: 'Email',
    created: new Date(Date.UTC(2026, 5, 23, 8, 47)),
    closed: null,
    firstResponse: 1_260,
    firstResolution: null,
    messagesSent: 2,
    labels: ['Delivery', 'Complaint'],
  },
  {
    id: 10482904,
    agent: 'Unassigned',
    status: 'Open',
    channel: 'Main website',
    channelType: 'Live chat',
    created: new Date(Date.UTC(2026, 5, 23, 8, 30)),
    closed: null,
    firstResponse: null,
    firstResolution: null,
    messagesSent: 0,
    labels: [],
  },
]

export const TICKET_EXPORT = {
  title: 'Export tickets',
  previewHeading: 'Example rows',
  empty: 'No tickets match these filters.',
  overLimit: (max: string) => `Narrow the filters to export: up to ${max} tickets at a time.`,
  // Screen readers only (the dialog's description); not shown on screen.
  pageFiltersNote: "Starts from this page's filters. Changes here only apply to the export.",
  cardFiltersNote: (source: string) =>
    `Starts from ${source} and this page's filters. Changes here only apply to the export.`,
  cancel: 'Cancel',
  preparingButton: 'Preparing export…',
  // Toasts for a background export.
  toastPreparing: (n: string) => `Preparing ${n} tickets…`,
  toastPreparingHint: "You can keep working. We'll tell you when the file is ready.",
  toastReady: (n: string) => `Your export of ${n} tickets has downloaded`,
  toastReadyHint: 'Find it in your downloads folder.',
  toastFailed: "Couldn't prepare the export",
  toastFailedHint: 'Nothing was downloaded. Try exporting again.',
  export: (count: string) => `Export ${count} tickets`,
  exportOne: 'Export 1 ticket',
} as const

/** Preview and CSV columns, in order: the "Keep" list of LEN-230 ("Which columns go into the
 *  new ticket export?", proposed 2026-11-11, not yet decided) — a fixed set, no picker, so
 *  personal data is reviewed once. Still open there, so left out: Assigned on, First response
 *  time (excluding AI). Business-hours variants follow LEN-229 q5 (the SLA milestone).
 *  `kind` tells the file how to write the cell. `label` is both the preview's heading AND the
 *  file's header, in this order (LEN-252: "same names as the page shows, Ticket ID first") —
 *  no second, technical set of names to keep in step. Dates name their timezone. */
export const TICKET_COLUMNS = [
  { key: 'id', label: 'Ticket ID', kind: 'text' },
  { key: 'agent', label: 'Assigned agent', kind: 'text' },
  { key: 'status', label: 'Ticket status', kind: 'text' },
  { key: 'channel', label: 'Channel', kind: 'text' },
  { key: 'channelType', label: 'Channel type', kind: 'text' },
  { key: 'created', label: 'Created on (UTC)', kind: 'date' },
  { key: 'closed', label: 'Closed on (UTC)', kind: 'date' },
  { key: 'firstResponse', label: 'First response time', kind: 'duration' },
  { key: 'firstResolution', label: 'First resolution time', kind: 'duration' },
  { key: 'messagesSent', label: 'Messages sent', kind: 'text' },
  { key: 'labels', label: 'Labels', kind: 'list' },
] as const

/** The status multi-select in page mode (V2 Ticket details' Status filter). */
export const TICKET_STATUSES = [
  { id: 'open', label: 'Open' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'closed', label: 'Closed' },
]

/** Mock label names — the kind workspaces attach to tickets. */
export const MOCK_LABELS = [
  'Order status',
  'Billing question',
  'Returns',
  'Complaint',
  'Feature request',
  'Priority',
  'Delivery',
  'Account access',
] as const

/** Which cards offer "Export tickets", and what each export holds. A card with two ticket
 *  lines (Created vs closed) gets one item per line. `series` picks that line in the card's
 *  sample; the count always comes from the card itself (`ticketCountFor` in the mock). */
export interface TicketExportSource {
  label: string
  source: string
  status?: 'open' | 'assigned' | 'closed'
  dateRule: 'created' | 'closed'
  series?: number
}
// PARKED (2026-11-12): no card offers these any more — export starts from the page header.
// Kept for a later card click-through / drill-in.
export const TICKET_EXPORT_SOURCES: Record<string, TicketExportSource[]> = {
  open_tickets: [{ label: 'Export tickets', source: 'Open tickets', status: 'open', dateRule: 'created' }],
  assigned_tickets: [{ label: 'Export tickets', source: 'Assigned tickets', status: 'assigned', dateRule: 'created' }],
  conversations_and_new_contacts: [{ label: 'Export tickets', source: 'Tickets & new contacts', dateRule: 'created' }],
  conversations_by_channel: [{ label: 'Export tickets', source: 'Tickets by entry channel', dateRule: 'created' }],
  created_vs_closed: [
    { label: 'Export created tickets', source: 'Created tickets', dateRule: 'created', series: 0 },
    { label: 'Export closed tickets', source: 'Closed tickets', status: 'closed', dateRule: 'closed', series: 1 },
  ],
}
