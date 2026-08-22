"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavLink } from "@/components/layout/nav-link";
import { Button } from "@/components/ui/button";
import { authRoutes, marketingNav } from "@/config/navigation";
import { useActiveSection } from "@/hooks/use-active-section";
import { useScrolled } from "@/hooks/use-scrolled";
import { cn } from "@/lib/utils";

const SECTION_IDS = marketingNav
  .filter((item) => item.isAnchor)
  .map((item) => item.href.replace("#", ""));

/**
 * Sticky site header.
 *
 * Two states: tall and transparent at the top of the page, then compact with a
 * glass wash and hairline rule once scrolled. Height is animated via CSS custom
 * properties on the inner row so the transition doesn't reflow the page.
 */
export function SiteHeader() {
  const scrolled = useScrolled(16);
  const pathname = usePathname();
  const activeSection = useActiveSection(SECTION_IDS, pathname === "/");

  return (
    <header
      data-scrolled={scrolled ? "true" : "false"}
      className={cn(
        "sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        scrolled
          ? "border-b border-white/8 bg-ink-950/72 shadow-[0_12px_40px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto w-full max-w-[84rem] px-5 md:px-8 xl:px-10">
        <div
          className={cn(
            "flex items-center justify-between gap-6 transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            scrolled ? "h-15" : "h-18 md:h-20"
          )}
        >
          <Logo size={scrolled ? "sm" : "md"} />

          <nav
            aria-label="Main"
            className="hidden items-center gap-8 lg:flex"
          >
            {marketingNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={
                  item.isAnchor
                    ? activeSection === item.href.replace("#", "")
                    : pathname === item.href && activeSection === null
                }
              />
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <Button
              asChild
              variant="ghost"
              size="md"
              className="hidden text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <Link href={authRoutes.login}>Login</Link>
            </Button>

            <Button
              asChild
              variant="accent"
              size="md"
              className="hidden sm:inline-flex"
            >
              <Link href={authRoutes.register}>
                Get Started
                <ArrowRight />
              </Link>
            </Button>

            <MobileNav activeSection={activeSection} />
          </div>
        </div>
      </div>
    </header>
  );
}
