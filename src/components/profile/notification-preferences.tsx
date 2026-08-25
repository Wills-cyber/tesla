"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  CircleDollarSign,
  Landmark,
  Megaphone,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import type { NotificationType } from "@/types/notification";

const categories: readonly {
  type: NotificationType;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    type: "auth",
    label: "Account",
    description: "Welcome, email verification and account standing.",
    icon: BadgeCheck,
  },
  {
    type: "security",
    label: "Security",
    description:
      "New sign-ins, password changes, email changes and failed login attempts.",
    icon: ShieldCheck,
  },
  {
    type: "deposit",
    label: "Deposits",
    description: "Pending, confirmed, credited and failed deposit events.",
    icon: Landmark,
  },
  {
    type: "withdrawal",
    label: "Withdrawals",
    description: "Requests, processing, completion, rejection and cancellation.",
    icon: Send,
  },
  {
    type: "investment",
    label: "Investments",
    description: "Activation and completion of a plan term.",
    icon: TrendingUp,
  },
  {
    type: "profit",
    label: "Profit payments",
    description: "Each scheduled payment period that is actually credited.",
    icon: CircleDollarSign,
  },
  {
    type: "wallet",
    label: "Wallet",
    description: "Ledger and balance events that affect your account.",
    icon: Wallet,
  },
  {
    type: "promotion",
    label: "Promotions",
    description: "Optional offers sent by the platform.",
    icon: Sparkles,
  },
  {
    type: "announcement",
    label: "Announcements",
    description: "Platform notices such as maintenance and new plans.",
    icon: Megaphone,
  },
] as const;

/**
 * Notification preferences.
 *
 * Deliberately *not* a row of toggles. There is no `notification_preferences` table
 * yet, so a switch here would either do nothing or lie about being saved — and a
 * silently-ignored security-alert preference is worse than no control at all.
 *
 * Instead this states what the platform delivers — events are typed consistently
 * end to end, and new ones arrive in the feed and as a toast without a page
 * refresh — and gives a working link to the feed. When the preferences table
 * exists, each row gains a real switch and this comment goes away.
 */
export function NotificationPreferences({
  unreadCount = 0,
}: {
  unreadCount?: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
        These are the notifications the platform sends. Per-category controls arrive
        with the preferences backend; until then every category is delivered to your
        in-app feed and none can be switched off. New notifications appear
        instantly — an unread badge and a brief toast, without refreshing the page.
      </p>

      <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
        {categories.map((entry) => (
          <li
            key={entry.type}
            className="flex items-center gap-3.5 bg-surface-1 px-4 py-3.5"
          >
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-2 text-muted-foreground"
            >
              <entry.icon className="size-4" />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium">{entry.label}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {entry.description}
              </span>
            </div>

            <StatusPill tone="neutral" className="shrink-0">
              Always on
            </StatusPill>
          </li>
        ))}
      </ul>

      <Button asChild variant="hairline" size="md" className="self-start">
        <Link href={appRoutes.notifications}>
          <Bell />
          Open notifications
          {unreadCount > 0 && (
            <span data-numeric className="font-semibold">
              ({unreadCount})
            </span>
          )}
        </Link>
      </Button>
    </div>
  );
}
