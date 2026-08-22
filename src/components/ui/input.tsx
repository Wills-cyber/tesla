import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Sized up from the shadcn default (h-8 → h-11) to match the platform's spacious
 * form rhythm, and given a recessed treatment so an input reads as a well in the
 * surface rather than an outlined box.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-surface-2/70 px-3.5 py-2 text-sm text-foreground transition-[color,background-color,border-color,box-shadow] outline-none",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-subtle-foreground",
        "hover:border-hairline-strong",
        "focus-visible:border-brand/60 focus-visible:bg-surface-1 focus-visible:ring-3 focus-visible:ring-ring/25",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive/60 aria-invalid:ring-3 aria-invalid:ring-destructive/15",
        "autofill:shadow-[inset_0_0_0_1000px_var(--surface-1)] autofill:[-webkit-text-fill-color:var(--foreground)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
