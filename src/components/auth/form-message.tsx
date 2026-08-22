"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { AuthFormState } from "@/hooks/use-auth-form";

const toneConfig = {
  error: {
    icon: AlertCircle,
    container: "border-destructive/25 bg-destructive-surface text-foreground",
    iconClass: "text-destructive",
    /** Errors interrupt; notices don't. */
    live: "assertive" as const,
  },
  notice: {
    icon: Info,
    container: "border-brand-border bg-brand-surface text-foreground",
    iconClass: "text-brand",
    live: "polite" as const,
  },
  success: {
    icon: CheckCircle2,
    container: "border-success/25 bg-success-surface text-foreground",
    iconClass: "text-success",
    live: "polite" as const,
  },
} as const;

/**
 * Form-level result banner.
 *
 * `role="alert"` for errors and `aria-live="polite"` otherwise, so a screen
 * reader announces the outcome without the user having to hunt for it. The
 * wrapper keeps `aria-live` mounted at all times — a region that appears at the
 * same moment as its content is frequently missed by assistive tech.
 */
export function FormMessage({
  state,
  className,
}: {
  state: AuthFormState;
  className?: string;
}) {
  const config = state.tone ? toneConfig[state.tone] : null;

  return (
    <div
      aria-live={config?.live ?? "polite"}
      aria-atomic="true"
      className={cn("contents", className)}
    >
      <AnimatePresence mode="wait">
        {state.message && config && (
          <motion.div
            key={state.message}
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={transitions.fast}
            className="overflow-hidden"
          >
            <div
              role={state.tone === "error" ? "alert" : undefined}
              className={cn(
                "flex gap-3 rounded-xl border p-4 text-xs leading-relaxed",
                config.container
              )}
            >
              <config.icon
                aria-hidden="true"
                className={cn("mt-px size-4 shrink-0", config.iconClass)}
              />
              <p>{state.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
