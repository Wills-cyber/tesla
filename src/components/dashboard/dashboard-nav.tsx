"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { StatusPill } from "@/components/common/status-pill";
import { dashboardNav, dashboardSecondaryNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { DashboardNavItem } from "@/config/navigation";

type DashboardNavProps = {
  /** `sidebar` is the persistent desktop rail; `sheet` is the mobile drawer. */
  variant?: "sidebar" | "sheet";
  onNavigate?: () => void;
  className?: string;
};

/**
 * Dashboard navigation.
 *
 * Active state is derived from the pathname rather than tracked in state, so it
 * stays correct through browser back/forward and hard reloads. `/dashboard` is
 * matched exactly — a `startsWith` check would light up Overview on every child
 * route.
 */
export function DashboardNav({
  variant = "sidebar",
  onNavigate,
  className,
}: DashboardNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <NavSection
        label="Account"
        items={dashboardNav}
        isActive={isActive}
        variant={variant}
        onNavigate={onNavigate}
      />
      <NavSection
        label="Funds"
        items={dashboardSecondaryNav}
        isActive={isActive}
        variant={variant}
        onNavigate={onNavigate}
      />
    </div>
  );
}

function NavSection({
  label,
  items,
  isActive,
  variant,
  onNavigate,
}: {
  label: string;
  items: readonly DashboardNavItem[];
  isActive: (href: string) => boolean;
  variant: "sidebar" | "sheet";
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label={label} className="flex flex-col gap-2.5">
      <p className="eyebrow px-3">{label}</p>

      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const active = isActive(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/nav relative flex items-center gap-3 rounded-lg px-3 transition-colors duration-300",
                  variant === "sidebar" ? "py-2.5" : "py-3",
                  active
                    ? "bg-white/[0.05] text-foreground"
                    : "text-muted-foreground hover:bg-white/[0.025] hover:text-foreground"
                )}
              >
                {/* Active rail, drawn on the container's left edge. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-1/2 -left-px h-5 w-px -translate-y-1/2 origin-center bg-gold-500 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    active ? "scale-y-100" : "scale-y-0"
                  )}
                />

                <item.icon
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 transition-colors duration-300",
                    active
                      ? "text-gold-300"
                      : "text-muted-foreground/70 group-hover/nav:text-foreground/80"
                  )}
                />

                <span className="flex-1 text-sm font-medium">{item.label}</span>

                {item.comingSoon && (
                  <StatusPill
                    tone="neutral"
                    className="px-1.5 py-0.5 text-[0.6rem] tracking-[0.08em]"
                  >
                    Soon
                  </StatusPill>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
