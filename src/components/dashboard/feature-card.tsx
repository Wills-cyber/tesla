import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  /** Optional bullet points expanding on the description. */
  points?: readonly string[];
  /** Makes the whole card a link. Omit for a purely explanatory card. */
  href?: string;
  linkLabel?: string;
  /** Uses the gold accent treatment. Reserve it for one card per group. */
  accent?: boolean;
  className?: string;
};

/**
 * An explanatory card.
 *
 * The workhorse of the dashboard's educational sections: icon, heading, short
 * explanation, optional bullets. When `href` is set the whole card becomes the
 * link target rather than only the label, which is a much larger hit area on a
 * phone.
 */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  points,
  href,
  linkLabel = "Open",
  accent = false,
  className,
}: FeatureCardProps) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl border",
          accent
            ? "border-brand-border bg-surface-1 text-brand"
            : "border-hairline bg-surface-2 text-muted-foreground"
        )}
      >
        <Icon className="size-5" />
      </span>

      <div className="flex flex-1 flex-col gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>

        {points && points.length > 0 && (
          <ul className="mt-1 flex flex-col gap-2">
            {points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 text-sm text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-brand"
                />
                <span className="leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {href && (
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-emphasis">
          {linkLabel}
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/feature:translate-x-0.5"
          />
        </span>
      )}
    </>
  );

  const classes = cn(
    "group/feature flex h-full flex-col gap-4 p-5 sm:p-6",
    accent ? "panel-brand" : "panel panel-interactive",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          classes,
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        )}
      >
        {body}
      </Link>
    );
  }

  return <div className={classes}>{body}</div>;
}
