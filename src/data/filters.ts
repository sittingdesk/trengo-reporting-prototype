// Mock data for the global top-bar filters (channel / team / date range).
//
// ⚠️ Mock: these populate the filter dropdowns so the prototype feels real, but
// selecting them does NOT filter any data yet (no metrics are wired). Real
// options would come from the workspace's channels/teams.

export interface FilterOption {
  id: string
  label: string
}

/** Communication channels a conversation can come through. */
export const CHANNELS: FilterOption[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'livechat', label: 'Live chat' },
  { id: 'voice', label: 'Voice' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'sms', label: 'SMS' },
]

/** Teams that handle conversations. */
export const TEAMS: FilterOption[] = [
  { id: 'support', label: 'Support' },
  { id: 'sales', label: 'Sales' },
  { id: 'success', label: 'Customer success' },
  { id: 'billing', label: 'Billing' },
  { id: 'onboarding', label: 'Onboarding' },
]

/** Date-range presets shown beside the calendar. */
export const DATE_PRESETS: FilterOption[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'last3months', label: 'Last 3 months' },
  { id: 'lastYear', label: 'Last year' },
]
