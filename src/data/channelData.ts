// Channel catalog for the two-panel Channel filter.
//
// ⚠️ Mock only: a fixed taxonomy of categories → instances. Display names only —
// no phone numbers, handles, or identifier subtext anywhere. Real options would
// come from the workspace's connected channels.

export interface ChannelInstance {
  id: string
  name: string
}
export interface ChannelCategory {
  id: string
  label: string
  instances: ChannelInstance[]
}

// Names are written the way workspaces actually name channels — after the team or the
// purpose ("Support", "Billing", "Main website"), rather than after the channel type. So
// the title often doesn't say what kind of channel it is, which is why Performance by
// channel prints each row's type mark beside it. Two titles are deliberately shared
// across types ("Support" on WhatsApp and Email, "Sales" on WhatsApp and Voice): titles
// are only unique per account in practice, never guaranteed, and the type mark is what
// tells those rows apart. "WhatsApp untitled" stays as Trengo's own default for a channel
// nobody named.
//
// Categories are a FIXED taxonomy — WhatsApp/Telegram live under "Messaging",
// never under a "Chat" category. Live chat is its own category.
export const CATALOG: ChannelCategory[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    instances: [
      { id: 'wa_support', name: 'Support' },
      { id: 'wa_sales', name: 'Sales' },
      { id: 'wa_2', name: 'WhatsApp untitled' },
    ],
  },
  {
    id: 'livechat',
    label: 'Live chat',
    instances: [{ id: 'lc_web', name: 'Main website' }],
  },
  {
    id: 'email',
    label: 'Email',
    instances: [
      { id: 'em_support', name: 'Support' },
      { id: 'em_sales', name: 'Billing' },
      { id: 'em_info', name: 'Info' },
    ],
  },
  {
    id: 'voice',
    label: 'Voice',
    instances: [
      { id: 'v_main', name: 'Main line' },
      { id: 'v_nl', name: 'Netherlands' },
      { id: 'v_be', name: 'Belgium' },
      { id: 'v_sales', name: 'Sales' },
      { id: 'v_vip', name: 'VIP customers' },
    ],
  },
]

/** Flat list of every instance id — used for the "all selected" default + mock scaling. */
export const CHANNEL_INSTANCE_IDS: string[] = CATALOG.flatMap((c) => c.instances.map((i) => i.id))
