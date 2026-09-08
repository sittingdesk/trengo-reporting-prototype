// shadcn-vue Button — variant definitions.
//
// `sm` and `icon` are the 32px control size — the one design.md §3.3 already documents
// ("Circular button, 32×32") and the size the DS calls SM. Every 32px control in the app
// states its height explicitly rather than reaching it by padding arithmetic: 20px of
// line-height needs 5px of vertical padding to make 32 with a 1px border, and there is no
// 5px step, so padding could only ever land on 30 or 34.
//
// Radius is `pill` (24px) per design.md §7.5 — "Shared: padding 6px 12px, border-radius
// 24px …" — and §4, which names the `pill` token for "Pill buttons, toolbars, toggle
// controls". The sizes have to repeat it because cva's size classes come after the base.
// `buttonVariants` is a cva() helper: it returns the right Tailwind classes for
// a given variant + size. This is the standard shadcn-vue pattern; new buttons
// are added with `npx shadcn-vue@latest add <component>`.
import { cva, type VariantProps } from 'class-variance-authority'

export { default as Button } from './Button.vue'

/**
 * The FIELD surface — white ground, Grey-400 hairline, shadow-100. design.md §5.1 gives
 * shadow-100 to "Buttons, selects, toggles, small UI", and §5 closes with the rule that
 * every shadow is paired with a Grey-300/400 1px border. So this is the documented
 * surface for a small control, not a look invented for one button.
 *
 * Exported because FilterChip wears it too, and two copies of a surface is how the
 * filters and the buttons beside them drift apart. The `data-[state=open]` step is for
 * the ones that open a popover; it costs nothing on the ones that don't.
 *
 * Full literal class strings — Tailwind's JIT can't see a name built from a variable.
 */
export const FIELD_SURFACE =
  'border border-grey-400 bg-white text-grey-800 shadow-100 hover:bg-grey-100 data-[state=open]:bg-grey-100'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Default is DARK (Grey-900) — CLAUDE.md's explicit button rule.
        default: 'bg-button text-button-foreground hover:bg-button/90',
        // Brand colour (Leaf) for the rare emphasised action.
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        // Same surface as the filter chips, so a secondary control reads as one of them —
        // the difference is only the radius, which stays `pill` like every other button.
        field: FIELD_SURFACE,
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-pill px-3',
        lg: 'h-11 rounded-pill px-8',
        icon: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
