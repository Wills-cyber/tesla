"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAnchorScroll } from "@/hooks/use-anchor-scroll";
import { cn } from "@/lib/utils";
import type { MarketingNavItem } from "@/config/navigation";

type NavLinkProps = {
  item: MarketingNavItem;
  active?: boolean;
  className?: string;
  onNavigate?: () => void;
  /** `desktop` shows a hairline underline; `mobile` uses a larger tap target. */
  variant?: "desktop" | "mobile";
};

/**
 * A single navigation item.
 *
 * Anchors are still rendered as real `<a href="#…">` elements so they work
 * without JavaScript, are copyable, and announce correctly — the click handler
 * only upgrades the jump to a smooth, focus-managed scroll.
 */
export function NavLink({
  item,
  active = false,
  className,
  onNavigate,
  variant = "desktop",
}: NavLinkProps) {
  const scrollToAnchor = useAnchorScroll();
  const pathname = usePathname();

  const base =
    variant === "desktop"
      ? "relative inline-flex h-9 items-center rounded-md px-1 text-sm transition-colors"
      : "flex items-center justify-between rounded-lg px-3 py-3.5 text-[1.05rem] transition-colors";

  const tone = active
    ? "text-foreground"
    : "text-muted-foreground hover:text-foreground";

  if (item.isAnchor) {
    const href = pathname === "/" ? item.href : `/${item.href}`;

    return (
      <a
        href={href}
        aria-current={active ? "true" : undefined}
        onClick={(event) => {
          // Let modified clicks (new tab, etc.) behave normally.
          if (event.metaKey || event.ctrlKey || event.shiftKey) return;
          if (pathname === "/") {
            event.preventDefault();
            scrollToAnchor(item.href);
          }
          onNavigate?.();
        }}
        className={cn(base, tone, className)}
      >
        <span>{item.label}</span>
        {variant === "desktop" && <ActiveUnderline active={active} />}
      </a>
    );
  }

  const isActive = active || pathname === item.href;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        base,
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <span>{item.label}</span>
      {variant === "desktop" && <ActiveUnderline active={isActive} />}
    </Link>
  );
}

function ActiveUnderline({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -bottom-0.5 left-0 h-px w-full origin-left bg-gold-500 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        active ? "scale-x-100" : "scale-x-0"
      )}
    />
  );
}
