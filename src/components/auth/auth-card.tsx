import * as React from "react";
import Link from "next/link";
import { Info } from "lucide-react";

import { Logo } from "@/components/brand/logo";
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
 * The logo links home so a visitor is never trapped on a form, and the
 * pre-launch notice sits above the fields rather than below the submit button —
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
      <div className="flex flex-col gap-7">
        <Logo size="md" />

        <div className="flex flex-col gap-2.5">
          <h1 className="text-3xl font-medium tracking-[-0.025em] sm:text-[2.1rem]">
            {title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        </div>
      </div>

      {notice && (
        <div className="flex gap-3 rounded-xl border border-gold-500/20 bg-gold-500/[0.045] p-4">
          <Info
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-gold-300"
          />
          <p className="text-xs leading-relaxed text-gold-100/85">{notice}</p>
        </div>
      )}

      {children}

      {footer && (
        <div className="border-t border-white/8 pt-6 text-sm text-muted-foreground">
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
        className="font-medium text-gold-200 underline decoration-gold-500/40 underline-offset-4 transition-colors hover:decoration-gold-400"
      >
        {label}
      </Link>
    </p>
  );
}
