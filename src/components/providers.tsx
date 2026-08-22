"use client";

import * as React from "react";
import { MotionConfig } from "motion/react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Client-side providers for the whole app.
 *
 * `reducedMotion="user"` is the important one: it makes Motion honour the OS
 * "reduce motion" setting for every transform and layout animation in the app,
 * so individual components never have to branch on it. The CSS side is covered
 * by the `prefers-reduced-motion` block in `globals.css`.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </MotionConfig>
  );
}
