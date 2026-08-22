"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Root error boundary.
 *
 * `error.tsx` catches render and data-fetching failures in this segment and
 * below. The digest is surfaced because it's the only way a user can give support
 * something actionable — the underlying message is withheld in production by
 * Next.js on purpose, since it can contain server details.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Swap for a real reporter (Sentry, Vercel Observability) when wired up.
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-5 py-20 text-center">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-full border border-warning/25 bg-warning-surface text-warning"
      >
        <AlertTriangle className="size-6" />
      </span>

      <div className="flex max-w-lg flex-col gap-3">
        <h1 className="text-2xl font-medium sm:text-3xl">Something went wrong</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          This page failed to load. The problem is on our side, not with your
          account — nothing has been changed.
        </p>
        {error.digest && (
          <p
            data-numeric
            className="text-xs text-subtle-foreground"
          >
            Reference: {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="accent" size="md" onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
        <Button asChild variant="hairline" size="md">
          <Link href="/">
            <Home />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
