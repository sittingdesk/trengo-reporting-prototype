# svg icons

Local Trengo icon assets. The `Icon.vue` component (`src/components/Icon.vue`)
loads every `*.svg` in this folder and matches by name.

## How to add an icon

1. In Figma the icon is named `Icon / {Name} - outline` (e.g. `Icon / Phone - outline`).
2. Save the SVG here using the bare name, lowercase + hyphens: `phone.svg`,
   `chevron-down.svg`. Matching is fuzzy (case / separators / the `Icon /` and
   `- outline` decoration are ignored), so `Phone.svg` or `phone-outline.svg`
   also resolve for `Icon / Phone - outline`.
3. Use it: `<Icon name="phone" :size="20" class="text-grey-700" />`.

## Conventions (design.md §8.1)

- Outline style: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
  `stroke-width="2"`, round caps/joins.
- Color comes from the parent via `text-*` (icons use `currentColor`).
- Render sizes: 16 / 20 / 32px only.

## Fallback

If no reasonable local match exists, pull from the Figma source
(file `6F8rU64QxDONx5YaQrxA0J`, icons frame node `2342:64352`) — see design.md §8.2.
