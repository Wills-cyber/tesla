import * as React from "react";

import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  /** Heading level. Landing sections use h2; the hero owns h1. */
  as?: "h1" | "h2" | "h3";
  className?: string;
  children?: React.ReactNode;
};

const titleSizes = {
  h1: "text-4xl sm:text-5xl lg:text-6xl",
  h2: "text-3xl sm:text-4xl lg:text-[2.9rem]",
  h3: "text-2xl sm:text-3xl",
} as const;

/**
 * The repeated heading unit: gold-dotted eyebrow, large title, muted lede.
 *
 * Using one component for every band is what keeps typographic scale consistent
 * across nine landing sections.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  as = "h2",
  className,
  children,
}: SectionHeadingProps) {
  const Heading = as;

  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-brand shadow-[0_0_12px_2px_var(--gold-600)]"
          />
          <span className="eyebrow">{eyebrow}</span>
        </span>
      )}

      <Heading
        className={cn(
          "font-medium text-balance text-foreground",
          titleSizes[as]
        )}
      >
        {title}
      </Heading>

      {description && (
        <p
          className={cn(
            "max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-[1.05rem]",
            align === "center" && "mx-auto"
          )}
        >
          {description}
        </p>
      )}

      {children}
    </div>
  );
}
