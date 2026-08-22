"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";

/**
 * Application error boundary.
 *
 * Scoped to the app shell, so a failed query keeps the top bar and bottom
 * navigation intact — the user can move to another area instead of being dropped
 * onto a blank page.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app/(app)/error]", error);
  }, [error]);

  return (
    <div role="alert" className="panel flex flex-col items-start gap-6 p-7">
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-xl border border-warning/25 bg-warning-surface text-warning"
      >
        <AlertTriangle className="size-5" />
      </span>

      <div className="flex max-w-lg flex-col gap-2.5">
        <h1 className="text-xl font-medium">This section didn&apos;t load</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Your account data couldn&apos;t be fetched. Nothing has been changed —
          balances and history are read-only here.
        </p>
        {error.digest && (
          <p data-numeric className="text-xs text-subtle-foreground">
            Reference: {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="accent" size="md" onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
        <Button asChild variant="outline" size="md">
          <Link href={appRoutes.dashboard}>Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
