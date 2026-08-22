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

import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Notification,
  NotificationCategory,
} from "@/types/notification";

const categoryIcons: Record<NotificationCategory, LucideIcon> = {
  account: BadgeCheck,
  investment: TrendingUp,
  transaction: Receipt,
  security: ShieldCheck,
  platform: Megaphone,
};

/**
 * Notification feed.
 *
 * Unread items are marked with both a dot and a `Unread` label — colour alone
 * would exclude anyone who can't perceive it. The whole row is a link only when
 * the notification actually has a destination.
 */
export function NotificationList({
  notifications,
}: {
  notifications: readonly Notification[];
}) {
  return (
    <ul className="flex flex-col divide-y divide-white/6 overflow-hidden rounded-xl border border-white/10">
      {notifications.map((notification) => {
        const Icon = categoryIcons[notification.category] ?? Bell;
        const unread = notification.readAt === null;

        const body = (
          <div className="flex gap-4">
            <span
              aria-hidden="true"
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-lg border",
                unread
                  ? "border-gold-500/25 bg-gold-500/8 text-gold-300"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground"
              )}
            >
              <Icon className="size-4" />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    unread ? "text-foreground" : "text-foreground/80"
                  )}
                >
                  {notification.title}
                </p>
                {unread && (
                  <span className="text-[0.65rem] tracking-[0.12em] text-gold-300 uppercase">
                    Unread
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {notification.body}
              </p>

              <time
                dateTime={notification.createdAt}
                className="text-xs text-muted-foreground/70"
              >
                {formatRelativeTime(notification.createdAt)}
              </time>
            </div>
          </div>
        );

        return (
          <li key={notification.id}>
            {notification.href ? (
              <Link
                href={notification.href}
                className="block px-4 py-4 transition-colors duration-300 hover:bg-white/[0.025] sm:px-5"
              >
                {body}
              </Link>
            ) : (
              <div className="px-4 py-4 sm:px-5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
