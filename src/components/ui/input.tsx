import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Sized up from the shadcn default (h-8 → h-11) to match the platform's
 * spacious form rhythm, and given a dark-surface treatment so inputs read as
 * recessed rather than outlined.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-white/[0.02] px-3.5 py-2 text-sm text-foreground transition-[color,background-color,border-color,box-shadow] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground/70",
        "hover:border-white/22",
        "focus-visible:border-gold-500/60 focus-visible:bg-white/[0.04] focus-visible:ring-3 focus-visible:ring-gold-500/15",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive/60 aria-invalid:ring-3 aria-invalid:ring-destructive/15",
        "autofill:shadow-[inset_0_0_0_1000px_var(--ink-900)] autofill:[-webkit-text-fill-color:var(--foreground)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
