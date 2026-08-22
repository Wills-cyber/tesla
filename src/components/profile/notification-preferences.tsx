import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  Megaphone,
  Receipt,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { StatusPill } from "@/components/common/status-pill";
import { Button } from "@/components/ui/button";
import { appRoutes } from "@/config/navigation";
import type { NotificationCategory } from "@/types/notification";

const categories: readonly {
  category: NotificationCategory;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    category: "account",
    label: "Account",
    description: "Verification status, profile changes and account standing.",
    icon: BadgeCheck,
  },
  {
    category: "investment",
    label: "Investments",
    description: "Activation, each payment period, and completion of a term.",
    icon: TrendingUp,
  },
  {
    category: "transaction",
    label: "Transactions",
    description: "Deposits credited, withdrawals submitted, processed or failed.",
    icon: Receipt,
  },
  {
    category: "security",
    label: "Security",
    description: "Sign-ins from a new device, password and email changes.",
    icon: ShieldCheck,
  },
  {
    category: "platform",
    label: "Platform",
    description: "New plans, and when deposits and withdrawals open.",
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
 * Instead this states what the platform sends and which categories are currently
 * always-on, and gives a working link to the feed. When the preferences table
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
        in-app feed and none can be switched off.
      </p>

      <ul className="flex flex-col divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
        {categories.map((entry) => (
          <li
            key={entry.category}
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
