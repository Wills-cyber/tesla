import * as React from "react";

import { cn } from "@/lib/utils";

type SectionProps = React.ComponentProps<"section"> & {
  /** Vertical rhythm. `lg` is the landing-page default. */
  spacing?: "sm" | "md" | "lg";
  /** Draws a hairline rule across the top of the section. */
  divided?: boolean;
};

const spacingClasses = {
  sm: "py-14 md:py-20",
  md: "py-20 md:py-28",
  lg: "py-24 md:py-32 lg:py-40",
} as const;

/**
 * A landing-page band.
 *
 * `id` doubles as the scroll anchor target, and `scroll-mt` compensates for the
 * sticky header so headings aren't hidden behind it.
 */
export function Section({
  className,
  spacing = "lg",
  divided = false,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "relative scroll-mt-24",
        spacingClasses[spacing],
        divided && "border-t border-white/8",
        className
      )}
      {...props}
    />
  );
}
