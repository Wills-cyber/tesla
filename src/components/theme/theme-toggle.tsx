"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Light/dark preference control.
 *
 * `icon` for the app top bar, `row` for the Profile page where it sits inside a
 * settings list and needs a label.
 */
export function ThemeToggle({
  variant = "icon",
  className,
}: {
  variant?: "icon" | "row";
  className?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  if (variant === "row") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 py-4",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-2 text-muted-foreground"
          >
            <Monitor className="size-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Appearance</span>
            <span className="text-xs text-muted-foreground">
              {isDark ? "Dark theme" : "Light theme (default)"}
            </span>
          </div>
        </div>

        <Button variant="outline" size="md" onClick={toggleTheme}>
          {isDark ? <Sun /> : <Moon />}
          Switch to {isDark ? "light" : "dark"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
