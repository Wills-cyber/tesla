import * as React from "react";
import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type ErrorBannerProps = {
  /**
   * A user-safe explanation. Technical detail (stack traces, Supabase errors,
   * query internals) belongs in the server logs where it was produced, never
   * here — pages pass already-sanitised messages from the data layer.
   */
  message: string;
  /** Optional recovery hint shown under the message. */
  hint?: string;
  className?: string;
};

/**
 * The app's single error surface.
 *
 * Warm, readable and actionable rather than alarming: a red border and icon
 * mark the block as a problem, but the copy stays plain language. Every page
 * that can fail renders this instead of inventing its own box.
 */
export function ErrorBanner({ message, hint, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3.5 rounded-2xl border border-destructive/25 bg-destructive-surface p-5",
        className
      )}
    >
      <TriangleAlert
        aria-hidden="true"
        className="mt-0.5 size-4.5 shrink-0 text-destructive"
      />
      <div className="flex flex-col gap-1">
        <p className="text-sm leading-relaxed font-medium text-foreground">
          {message}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {hint ?? "Refreshing the page usually resolves this. If it keeps happening, contact support."}
        </p>
      </div>
    </div>
  );
}
