"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Dashboard error boundary.
 *
 * Scoped to the dashboard segment so a failed query keeps the sidebar and header
 * intact — the user can still navigate to another section rather than being
 * dropped onto a blank page.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[app/dashboard/error]", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-6 rounded-xl border border-white/10 bg-white/[0.02] p-7"
    >
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-lg border border-amber-400/25 bg-amber-400/8 text-amber-200"
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
          <p data-numeric className="text-xs text-muted-foreground/60">
            Reference: {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="accent" size="md" onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
        <Button asChild variant="hairline" size="md">
          <Link href="/dashboard">Back to overview</Link>
        </Button>
      </div>
    </div>
  );
}
