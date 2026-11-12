// useTicketExport — open state and scope of the Export tickets modal.
//
// Two ways in, one modal (TicketExportDialog, mounted once in App.vue): the dashboard
// header's "Export tickets" (every ticket created in the page's scope) and a ticket-count
// card's ⋯ menu (the tickets behind that card's number). The caller works out the count from
// its own sample, so a card's export can't disagree with the number on the card.
import { reactive, readonly } from 'vue'

export type TicketStatus = 'open' | 'assigned' | 'closed'

export interface TicketExportScope {
  /** Opened from the page header (all tickets in scope) or from one card. */
  origin: 'page' | 'card'
  /** What the export is "of", for the "From …" line and filename — e.g. "Open tickets". */
  source: string
  /** From a card: the card's own number. From the page the modal counts its own scope. */
  count: number
  /** Set when the source fixes the status (Open tickets → open). Otherwise a mix. */
  status?: TicketStatus
  /** Which date the range is judged on: when tickets were created, or closed. */
  dateRule: 'created' | 'closed'
}

const state = reactive({
  open: false,
  scope: null as TicketExportScope | null,
})
// Where focus goes when the modal closes. It opens from state, not from a DialogTrigger, so
// reka can't return focus by itself — a closing ⋯ menu would drop it to <body>. Kept outside
// the reactive state: a DOM node has no business being made reactive.
let returnFocus: HTMLElement | null = null

export function useTicketExport() {
  function openTicketExport(scope: TicketExportScope, focusOnClose?: HTMLElement | null) {
    state.scope = scope
    returnFocus = focusOnClose ?? null
    state.open = true
  }
  function closeTicketExport() {
    state.open = false
  }
  return { ticketExport: readonly(state), openTicketExport, closeTicketExport, returnFocusTarget: () => returnFocus }
}
