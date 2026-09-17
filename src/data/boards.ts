// Boards — the sales pipelines a workspace runs deals through.
//
// A board is Trengo's deal pipeline. Sales metrics are board-shaped upstream (the registry
// computes the sales cycle from `board_card_time_to_close_days`), but nothing in the app
// expressed that until now: the four sales cards showed one number each, silently summed
// across every board.
//
// ⚠️ Board is deliberately NOT a global filter. TECH_FOUNDATION §7 reduced the old
// reporting's filter set to three — channel, team, date — naming boards as one of the
// things dropped. That decision stands: this is a break-down INSIDE one widget, which is a
// different thing from a page-level scope. A board filter on Overview would also rescope
// Open tickets and the voice heatmap, for which a board means nothing.
//
// CURRENCY LIVES HERE, on the board, and that is the whole reason this file exists.
// "Average deal size" isn't denominated in anything — the deals are, and a deal belongs to
// a board. Put it on the metric and every workspace has one currency forever; put it on the
// workspace and you've invented a reporting currency, which needs FX rates and a conversion
// date before it can show a single number.
//
// ⚠️ Assumption to confirm with the data team: one board, one currency. If a single board
// can hold deals in several currencies then that board has no currency of its own, and
// nothing here can show an amount without conversion.

export interface Board {
  id: string
  label: string
  /** ISO 4217. Amounts from different boards are never added — see `sales_by_board`. */
  currency: 'EUR' | 'USD'
}

// Three, not a dozen: a real workspace usually runs one or two, and the widget is built to
// read correctly at one. The third exists to carry a second currency, which is the case the
// four separate cards could never show honestly.
// Labels are short on purpose — this is the first column of a half-width table, and
// "Upsells & Renewals Board" (the name the old sales prototype used) eats a third of it.
export const BOARDS: Board[] = [
  { id: 'new_sales', label: 'New sales', currency: 'EUR' },
  { id: 'upsells', label: 'Upsells & renewals', currency: 'EUR' },
  { id: 'us_expansion', label: 'US expansion', currency: 'USD' },
]
