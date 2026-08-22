"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Menu } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { NavLink } from "@/components/layout/nav-link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authRoutes, marketingNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { EASE_LUXE } from "@/lib/motion";
import { cn } from "@/lib/utils";

type MobileNavProps = {
  activeSection: string | null;
};

const itemVariants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0 },
};

/**
 * Mobile navigation.
 *
 * Built on the Sheet (Radix Dialog) so focus trapping, `Escape` to close, scroll
 * locking and `aria-modal` come for free — then the items are staggered in with
 * Motion for the entrance. Reduced-motion users get the panel without the slide.
 */
export function MobileNav({ activeSection }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="hairline"
          size="icon-lg"
          className="lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton
        className="flex w-[min(88vw,23rem)] flex-col gap-0 border-l border-hairline bg-popover/95 p-0 backdrop-blur-2xl sm:max-w-none"
      >
        <SheetHeader className="border-b border-hairline px-6 py-5 text-left">
          <SheetTitle asChild>
            <div>
              <Logo size="sm" asLink={false} />
            </div>
          </SheetTitle>
        </SheetHeader>

        <motion.nav
          aria-label="Main"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.055, delayChildren: 0.08 }}
          className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-6"
        >
          {marketingNav.map((item) => {
            const active = item.isAnchor
              ? activeSection === item.href.replace("#", "")
              : false;

            return (
              <motion.div
                key={item.href}
                variants={itemVariants}
                transition={{ duration: 0.4, ease: EASE_LUXE }}
              >
                <SheetClose asChild>
                  <NavLink
                    item={item}
                    variant="mobile"
                    active={active}
                    className={cn(
                      "border-b border-hairline last:border-b-0",
                      active && "text-brand-emphasis"
                    )}
                    onNavigate={() => setOpen(false)}
                  />
                </SheetClose>
              </motion.div>
            );
          })}
        </motion.nav>

        <div className="flex flex-col gap-3 border-t border-hairline px-6 py-6">
          <Button asChild variant="hairline" size="md" className="w-full">
            <Link href={authRoutes.login} onClick={() => setOpen(false)}>
              Login
            </Link>
          </Button>
          <Button asChild variant="accent" size="md" className="w-full">
            <Link href={authRoutes.register} onClick={() => setOpen(false)}>
              Get Started
              <ArrowRight />
            </Link>
          </Button>
          <p className="pt-1 text-[0.7rem] leading-relaxed text-subtle-foreground">
            {siteConfig.prelaunchNotice}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
