import * as React from "react";
import Link from "next/link";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  /** Rendered under the form — usually the link to the opposite auth route. */
  footer?: React.ReactNode;
  /** Explains that auth has no backend yet. Shown on every auth screen. */
  notice?: React.ReactNode;
  className?: string;
};

/**
 * Shared chrome for the auth screens.
 *
 * Deliberately carries no logo. The shell owns brand identity — the mark sits in
 * the form column's top bar on small screens and in the brand panel from `lg` up —
 * so putting one here too stacked two lockups on top of each other on a phone.
 * Exactly one is visible at every breakpoint.
 *
 * The pre-launch notice sits above the fields rather than below the submit button:
 * people should know the state of the system before they type into it.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
  notice,
  className,
}: AuthCardProps) {
  return (
    <div className={cn("flex w-full flex-col gap-8", className)}>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-[2.1rem]">
          {title}
        </h1>
        {/* A short gold rule under the title — the one spot of brand colour on an
            otherwise deliberately quiet form. */}
        <span
          aria-hidden="true"
          className="h-px w-14 bg-gradient-to-r from-brand to-transparent"
        />
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      </div>

      {notice && (
        <div className="flex gap-3 rounded-xl border border-brand-border bg-brand-surface p-4">
          <Info
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-brand"
          />
          <p className="text-xs leading-relaxed text-foreground">{notice}</p>
        </div>
      )}

      {children}

      {footer && (
        <div className="border-t border-hairline pt-6 text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

/** The `Already have an account? Login` line shared by the auth screens. */
export function AuthSwitchLink({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p>
      {prompt}{" "}
      <Link
        href={href}
        className="font-medium text-brand-emphasis underline decoration-brand/45 underline-offset-4 transition-colors hover:decoration-brand"
      >
        {label}
      </Link>
    </p>
  );
}
