// Badge — small pill label (shadcn-vue style cva).
// Used for the "Recommended" template tag and the muted "Coming soon" pill.
import { cva, type VariantProps } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        // Brand-tinted — draws the eye to the recommended template.
        recommended: 'bg-leaf-100 text-leaf-700',
        // Neutral grey pill — "Coming soon", widget counts, etc.
        muted: 'bg-grey-200 text-grey-600',
      },
    },
    defaultVariants: {
      variant: 'muted',
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
