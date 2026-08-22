import * as React from "react";

import { cn } from "@/lib/utils";

type ContainerProps = React.ComponentProps<"div"> & {
  /** `wide` is the page default; `narrow` is for prose and auth cards. */
  width?: "wide" | "narrow";
};

/**
 * Horizontal rhythm for the whole app. Every page-level block goes through this
 * so gutters stay identical from the navbar down to the footer.
 */
export function Container({
  className,
  width = "wide",
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 md:px-8 xl:px-10",
        width === "wide" ? "max-w-[84rem]" : "max-w-3xl",
        className
      )}
      {...props}
    />
  );
}
