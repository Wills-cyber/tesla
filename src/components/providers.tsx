"use client";

import * as React from "react";
import { MotionConfig } from "motion/react";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Client-side providers for the whole app.
 *
 * `reducedMotion="user"` is the important one: it makes Motion honour the OS
 * "reduce motion" setting for every transform and layout animation in the app,
 * so individual components never have to branch on it. The CSS side is covered
 * by the `prefers-reduced-motion` block in `globals.css`.
 *
 * `ThemeProvider` holds the light/dark preference. Light is the default; the
 * class is applied pre-paint by `ThemeScript` in the root layout.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="top-center" />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
