"use client";

import * as React from "react";
import { motion } from "motion/react";
import { PanelsTopLeft } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { siteConfig } from "@/config/site";
import { EASE_LUXE } from "@/lib/motion";

/**
 * Desktop sidebar.
 *
 * Sticky rather than fixed, so it participates in normal document flow and the
 * page keeps a single scroll container — the usual source of nested-scrollbar
 * bugs on dashboards.
 */
export function DashboardSidebar() {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE_LUXE }}
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between gap-8 border-r border-white/8 bg-ink-950/60 px-4 py-6 lg:flex xl:w-72"
    >
      <div className="flex flex-col gap-9">
        <div className="px-2">
          <Logo size="sm" />
        </div>
        <DashboardNav />
      </div>

      <div className="mx-2 rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="text-[0.7rem] leading-relaxed text-muted-foreground/75">
          {siteConfig.prelaunchNotice}
        </p>
      </div>
    </motion.aside>
  );
}

/** Mobile equivalent: the same nav inside a Sheet. */
export function DashboardNavSheet() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="hairline"
          size="icon-lg"
          className="lg:hidden"
          aria-label="Open dashboard menu"
        >
          <PanelsTopLeft />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        showCloseButton
        className="flex w-[min(86vw,19rem)] flex-col gap-0 border-r border-white/10 bg-ink-950/95 p-0 backdrop-blur-2xl sm:max-w-none"
      >
        <SheetHeader className="border-b border-white/8 px-5 py-5 text-left">
          <SheetTitle asChild>
            <div>
              <Logo size="sm" asLink={false} />
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-6">
          <DashboardNav variant="sheet" onNavigate={() => setOpen(false)} />
        </div>

        <div className="border-t border-white/8 px-5 py-5">
          <p className="text-[0.7rem] leading-relaxed text-muted-foreground/75">
            {siteConfig.prelaunchNotice}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
