# RailSidebar — portable Trengo icon rail

The dark 72px app rail (icon navigation + utilities + avatar) as a **self-contained,
copy-paste component**. No Tailwind, no theme setup, no icon pipeline — everything it
needs lives in this folder.

## Use in another project

1. Copy this whole `rail/` folder into the project, e.g. `src/components/rail/`.
2. Import and render:

```vue
<script setup lang="ts">
import { RailSidebar } from '@/components/rail'
</script>

<template>
  <RailSidebar
    active="reports"
    :badges="{ notifications: 3 }"
    initials="JV"
    @select="(key) => console.log('clicked', key)"
    @avatar-click="console.log('avatar')"
  />
</template>
```

Requirements: **Vue 3** (script setup / composition API). Nothing else.

## Props (all optional — defaults reproduce the Trengo Reporting look)

| Prop | Type | Default | What it does |
|---|---|---|---|
| `topItems` | `string[]` | inbox, ai, broadcasting, contacts, boards, reports, settings | Top nav group (keys into `RAIL_ICONS`, in order) |
| `bottomItems` | `string[]` | calls, help, notifications | Bottom utility group |
| `active` | `string` | `'reports'` | Active item — dark chip + filled icon variant |
| `badges` | `Record<string, string \| number>` | `{ notifications: 11 }` | Count badge per item key |
| `initials` | `string \| null` | `'JV'` | Avatar initials; `null` hides the avatar |

## Events

- `select(key: string)` — any icon clicked (wire your router/navigation here).
- `avatar-click` — the avatar clicked.

## Theming (optional)

Colours are CSS custom properties with the Trengo palette baked in as defaults.
Override on any parent element:

```css
.my-app {
  --rail-bg: #111213;            /* column background */
  --rail-item: #c6c9cd;          /* idle icon colour */
  --rail-item-hover-bg: #292c2e; /* hover chip */
  --rail-active-bg: #4d5256;     /* active chip */
  --rail-active: #ffffff;        /* active icon colour */
  --rail-badge-bg: #e8374c;      /* notification badge */
  --rail-avatar-bg: #249888;     /* avatar circle */
  --rail-avatar-ring: #4d5256;   /* avatar ring */
}
```

## Icons

`railIcons.ts` holds the inline SVGs (outline `linear` + optional `filled` active
variant), all using `currentColor`. To add an item: add an entry to `RAIL_ICONS`
(key, label, svg strings) and include its key in `topItems`/`bottomItems`.
