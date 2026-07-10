// Empty-state system — config + copy, the single source of truth.
//
// One neutral empty pattern for every metric: an icon + a noun, rendered as
// "No {noun} in this period" / "Try a wider date range". Adding a new metric =
// one entry here, nothing else. Translate this one file to localise.
//
// Some metrics have no data source yet (e.g. sales/voice features not wired up).
// They set `always: true` so the card shows the same neutral empty state instead
// of a value — no feature-adoption check, no links to other features.

export interface EmptyStateConfig {
  /** Icon name for src/components/Icon.vue (local set, not Tabler). */
  icon: string
  /** Drives the copy: "No {noun} in this period". */
  noun?: string
  /** Force the empty state regardless of the (mock) value — no data source yet. */
  always?: boolean
}

export const EMPTY_STATES: Record<string, EmptyStateConfig> = {
  first_response_time: { noun: 'customer conversations', icon: 'Inbox' },
  resolution_time: { noun: 'conversations', icon: 'Inbox' },
  conversations_by_hour: { noun: 'conversations', icon: 'Inbox' },
  avg_csat: { noun: 'ratings', icon: 'EmotionSmile' },
  win_rate: { noun: 'decided deals', icon: 'Target' },
  call_wait_time: { noun: 'calls', icon: 'Phone' },
  created_vs_closed: { noun: 'conversations', icon: 'Inbox' },
  workload_by_agent: { noun: 'conversations', icon: 'Users' },
  performance_by_channel: { noun: 'conversations', icon: 'Inbox' },
  open_conversations: { noun: 'open conversations', icon: 'Inbox' },
  assigned_conversations: { noun: 'assigned conversations', icon: 'Inbox' },

  // ---- no data source yet → always the neutral empty state ----
  avg_deal_size: { noun: 'deals', icon: 'Target', always: true },
  pipeline_value: { noun: 'deals', icon: 'Target', always: true },
  calls_volume: { noun: 'calls', icon: 'Phone', always: true },
}

/** Copy template — the ONLY place empty-state wording lives. */
export const COPY = {
  empty: {
    title: (c: EmptyStateConfig) => `No ${c.noun ?? 'data'} in this period`,
    subline: () => 'Try a wider date range',
  },
} as const

/** Config for a metric — unknown ids fall back to a generic empty. */
export function resolveEmptyState(metricId: string): EmptyStateConfig {
  return EMPTY_STATES[metricId] ?? { noun: 'data', icon: 'Inbox' }
}
