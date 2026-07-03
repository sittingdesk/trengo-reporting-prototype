// Empty-state system — config + copy, the single source of truth.
//
// One entry per metric decides WHICH empty situation applies and with what
// noun/icon; the COPY templates hold the actual wording (translate this one
// file to localise). Adding a new metric = one entry here, nothing else.
//
// States (besides value/loading/restricted):
//   empty       — feature works, no events in the selected range
//   adoption    — feature available but never set up (e.g. no boards)
//   definition  — metric exists but its calculation isn't locked yet
//   development — metric/product not built yet
// definition/development render with a DASHED card border (handled by MetricBox).

export type EmptyStateKind = 'empty' | 'adoption' | 'definition' | 'development'

export interface EmptyStateConfig {
  state: EmptyStateKind
  /** Icon name for src/components/Icon.vue (local set, not Tabler). */
  icon: string
  /** Drives the generic `empty` copy: "No {noun} in this period". */
  noun?: string
  /** Per-metric title for `adoption` (e.g. "No boards yet"). */
  title?: string
  /** CTA label for `adoption`. */
  cta?: string
  ctaHref?: string
}

export const EMPTY_STATES: Record<string, EmptyStateConfig> = {
  // ---- generic empties: only a noun + icon needed ----
  first_response_time: { state: 'empty', noun: 'customer conversations', icon: 'Inbox' },
  resolution_time: { state: 'empty', noun: 'conversations', icon: 'Inbox' },
  conversations_by_hour: { state: 'empty', noun: 'conversations', icon: 'Inbox' },
  avg_csat: { state: 'empty', noun: 'ratings', icon: 'EmotionSmile' },
  win_rate: { state: 'empty', noun: 'decided deals', icon: 'Target' },
  call_wait_time: { state: 'empty', noun: 'calls', icon: 'Phone' },
  created_vs_closed: { state: 'empty', noun: 'conversations', icon: 'Inbox' },
  workload_by_agent: { state: 'empty', noun: 'conversations', icon: 'Users' },
  performance_by_channel: { state: 'empty', noun: 'conversations', icon: 'Inbox' },
  open_conversations: { state: 'empty', noun: 'open conversations', icon: 'Inbox' },
  assigned_conversations: { state: 'empty', noun: 'assigned conversations', icon: 'Inbox' },

  // ---- adoption: feature exists, never used → actionable prompt ----
  avg_deal_size: {
    state: 'adoption',
    icon: 'Kanban',
    title: 'No boards yet',
    cta: 'Create a board',
    ctaHref: '#',
  },

  // ---- definition: calculation not locked yet ----
  pipeline_value: { state: 'definition', icon: 'Wrench' },
  calls_volume: { state: 'definition', icon: 'Wrench' },

  // ---- development: not built yet ----
  // (sla_compliance lives in a table column, not a card — no entry needed)
}

/** Copy templates — the ONLY place empty-state wording lives. */
export const COPY = {
  empty: {
    title: (c: EmptyStateConfig) => `No ${c.noun ?? 'data'} in this period`,
    subline: () => 'Try a wider date range',
  },
  adoption: {
    title: (c: EmptyStateConfig) => c.title ?? 'Not set up yet',
    cta: (c: EmptyStateConfig) => `${c.cta} →`,
  },
  definition: {
    title: () => 'Definition in progress',
    subline: () => "We're finalising how this is calculated",
  },
  development: {
    title: () => 'In development',
    subline: () => "We're still building this metric",
  },
} as const

/** Config for a metric — unknown ids fall back to a generic `empty`. */
export function resolveEmptyState(metricId: string): EmptyStateConfig {
  return EMPTY_STATES[metricId] ?? { state: 'empty', noun: 'data', icon: 'Inbox' }
}
