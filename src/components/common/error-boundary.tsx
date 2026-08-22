"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorBoundaryState = { error: Error | null };

type ErrorBoundaryProps = {
  children: React.ReactNode;
  /** Rendered instead of the default panel. Receives a reset callback. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Shown in the default panel to say which part of the UI failed. */
  label?: string;
};

/**
 * Component-level error boundary.
 *
 * Route-level failures are handled by `error.tsx` files; this is for wrapping an
 * individual widget so one broken panel doesn't blank a whole dashboard page.
 *
 * Note that React error boundaries only catch render-phase errors — errors
 * thrown from event handlers or async callbacks must be caught and put into
 * state by the component itself.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Replace with a real reporter (Sentry, Vercel Observability) when wired up.
    console.error("[ErrorBoundary]", this.props.label ?? "unlabelled", error, info);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-xl border border-hairline bg-surface-2 p-6"
      >
        <span
          aria-hidden="true"
          className="grid size-10 place-items-center rounded-lg border border-warning/25 bg-warning-surface text-warning"
        >
          <AlertTriangle className="size-4.5" />
        </span>

        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">
            {this.props.label
              ? `${this.props.label} couldn't be displayed`
              : "Something didn't load"}
          </p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            The rest of the page is unaffected. Try again, and if it keeps
            happening the issue is on our side.
          </p>
        </div>

        <Button variant="hairline" size="md" onClick={this.reset}>
          <RotateCcw />
          Try again
        </Button>
      </div>
    );
  }
}
