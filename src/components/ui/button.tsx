import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * shadcn's button, extended for this product:
 *   - `accent` — the metallic gold CTA. Dark ink on gold, so it clears AA at body
 *     sizes; the default charcoal `default` variant handles neutral primaries.
 *   - `hairline` — a quiet secondary that reads on both the ivory and dark
 *     palettes: a real surface with a hairline border rather than a wash.
 *   - `md` / `xl` sizes, because the default h-8 is too tight for a spacious,
 *     touch-friendly layout.
 *
 * If you re-run `shadcn add`, do not pass `--overwrite` — it will drop these.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-card hover:bg-primary/90 hover:shadow-lift",
        outline:
          "border-hairline-strong bg-surface-1 text-foreground shadow-soft hover:border-foreground/25 hover:bg-surface-2 aria-expanded:bg-surface-2",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-surface-3 aria-expanded:bg-surface-3",
        ghost:
          "hover:bg-surface-2 hover:text-foreground aria-expanded:bg-surface-2 aria-expanded:text-foreground",
        destructive:
          "bg-destructive-surface text-destructive hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-brand-emphasis underline-offset-4 hover:underline",
        /** Primary brand action: metallic champagne gold with a soft lift. */
        accent:
          "bg-gradient-to-b from-gold-400 to-gold-600 text-brand-contrast shadow-[0_8px_24px_-12px_var(--gold-600)] hover:from-gold-300 hover:to-gold-500 hover:shadow-[0_14px_34px_-14px_var(--gold-600)]",
        /** Quiet secondary action. Works on ivory and on dark. */
        hairline:
          "border-hairline bg-surface-1 text-foreground shadow-soft hover:border-hairline-strong hover:bg-surface-2 hover:shadow-card",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        /** Form controls and dashboard actions. */
        md: "h-11 gap-2 px-5 text-[0.9rem] [&_svg:not([class*='size-'])]:size-4",
        /** Marketing CTAs. Generous, but still hairline-crisp. */
        xl: "h-13 gap-2.5 px-7 text-[0.95rem] tracking-[-0.01em] [&_svg:not([class*='size-'])]:size-[1.05rem]",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
        "icon-xl": "size-11 [&_svg:not([class*='size-'])]:size-[1.05rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
