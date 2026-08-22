"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";

import { getActivePrimaryHref, primaryNav } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * The application's only navigation.
 *
 * A floating, rounded bar pinned to the bottom of the viewport on every screen
 * size — there is no desktop sidebar to fall back to. On desktop it centres at a
 * comfortable maximum width instead of stretching edge to edge; on mobile it
 * fills the width inside a safe margin and respects `env(safe-area-inset-bottom)`
 * so it clears the home indicator.
 *
 * Active state is derived from the pathname, never held in state, so it stays
 * correct through back/forward navigation and hard reloads. The moving pill is a
 * shared `layoutId`, which means Motion interpolates it between tabs rather than
 * cross-fading two separate elements.
 *
 * Pages must sit inside a `.pb-bottom-nav` container so this never covers
 * content — the clearance is a token in `globals.css`.
 */
export function BottomNavigation() {
  const pathname = usePathname();
  const activeHref = getActivePrimaryHref(pathname);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center",
        "px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4"
      )}
    >
      <nav
        aria-label="Primary"
        className={cn(
          "glass pointer-events-auto w-full max-w-lg rounded-3xl border border-hairline shadow-float",
          "supports-[not(backdrop-filter:blur(0px))]:bg-surface-1"
        )}
      >
        <ul className="flex items-stretch justify-between gap-0.5 p-1.5">
          {primaryNav.map((item) => {
            const active = activeHref === item.href;

            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.purpose}
                  className={cn(
                    "group/tab relative flex h-full flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2",
                    "transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                    active
                      ? "text-brand-emphasis"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Moving active pill, shared across tabs. */}
                  {active && (
                    <motion.span
                      layoutId="bottom-nav-pill"
                      aria-hidden="true"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                        mass: 0.7,
                      }}
                      className="absolute inset-0 -z-10 rounded-2xl border border-brand-border bg-brand-surface"
                    />
                  )}

                  <item.icon
                    aria-hidden="true"
                    className={cn(
                      "size-[1.15rem] shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      active ? "scale-105" : "group-hover/tab:scale-105"
                    )}
                  />

                  <span
                    className={cn(
                      "max-w-full truncate text-[0.65rem] leading-none font-medium tracking-[0.01em]",
                      active && "font-semibold"
                    )}
                  >
                    <span className="sm:hidden">{item.shortLabel}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
