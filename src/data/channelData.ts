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

// Categories are a FIXED taxonomy — WhatsApp/Telegram live under "Messaging",
// never under a "Chat" category. Live chat is its own category.
export const CATALOG: ChannelCategory[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    instances: [
      { id: 'wa_support', name: 'WhatsApp support' },
      { id: 'wa_sales', name: 'WhatsApp sales' },
      { id: 'wa_2', name: 'WhatsApp untitled' },
    ],
  },
  {
    id: 'livechat',
    label: 'Live chat',
    instances: [{ id: 'lc_web', name: 'Website chat' }],
  },
  {
    id: 'email',
    label: 'Email',
    instances: [
      { id: 'em_support', name: 'Support email' },
      { id: 'em_sales', name: 'Sales email' },
      { id: 'em_info', name: 'Info email' },
    ],
  },
  {
    id: 'voice',
    label: 'Voice',
    instances: [
      { id: 'v_main', name: 'Voice main' },
      { id: 'v_nl', name: 'Voice NL' },
      { id: 'v_be', name: 'Voice BE' },
      { id: 'v_sales', name: 'Voice sales' },
      { id: 'v_vip', name: 'Voice VIP' },
    ],
  },
]

/** Flat list of every instance id — used for the "all selected" default + mock scaling. */
export const CHANNEL_INSTANCE_IDS: string[] = CATALOG.flatMap((c) => c.instances.map((i) => i.id))
