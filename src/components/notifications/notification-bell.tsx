"use client";

import * as React from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  BellOff,
  CheckCheck,
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

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appRoutes } from "@/config/navigation";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types/notification";

import { useNotifications } from "./notifications-provider";

const DROPDOWN_ITEMS = 8;

const typeIcons: Record<NotificationType, LucideIcon> = {
  auth: BadgeCheck,
  security: ShieldCheck,
  deposit: Landmark,
  withdrawal: Send,
  investment: TrendingUp,
  profit: CircleDollarSign,
  wallet: Wallet,
  system: Megaphone,
  promotion: Sparkles,
  announcement: Megaphone,
};

/**
 * Notification bell with its dropdown panel.
 *
 * The badge, the list and the read state all come from the realtime provider, so
 * the number the user sees is current without polling. Clicking an item marks it
 * read optimistically and, when the notification has a destination, navigates
 * there; "Mark all as read" sweeps the unread set in one action.
 *
 * Subscribing to exactly one realtime channel for the signed-in user happens in
 * the provider (mounted once in the app shell), not per bell — opening this
 * dropdown never opens a second socket.
 */
export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const visible = notifications.slice(0, DROPDOWN_ITEMS);
  const hasUnread = unreadCount > 0;

  /**
   * Selecting an item marks it read. Navigation is left to the item's own link
   * when it has a destination — the dropdown never pushes a route itself, so a
   * prefetched link and this handler cannot race the router.
   */
  function selectNotification(notification: Notification) {
    if (!notification.isRead) {
      void markAsRead(notification.id);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={`Notifications${hasUnread ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell />
          {hasUnread && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[0.6rem] leading-4 font-bold text-brand-contrast ring-2 ring-background"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[min(24rem,calc(100vw-1.5rem))] p-0 shadow-lift"
      >
        <DropdownMenuLabel className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            Notifications
            {hasUnread && (
              <span className="ml-2 text-xs font-medium text-brand-emphasis">
                {unreadCount} unread
              </span>
            )}
          </span>
          {hasUnread && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-[0.62rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-colors duration-300 hover:border-brand-border hover:text-brand-emphasis focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <CheckCheck aria-hidden="true" className="size-3" />
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-0" />

        <div className="max-h-72 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <span className="grid size-10 place-items-center rounded-xl border border-hairline bg-surface-2 text-muted-foreground">
                <BellOff className="size-4" />
              </span>
              <p className="text-sm font-medium">{"You're all caught up"}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                New account activity appears here instantly.
              </p>
            </div>
          ) : (
            visible.map((notification) => {
              const Icon = typeIcons[notification.type] ?? Bell;
              const unread = !notification.isRead;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  asChild
                  onSelect={() => selectNotification(notification)}
                  className={cn(
                    "items-start gap-3 rounded-none px-4 py-3.5",
                    unread && "bg-brand-surface/40"
                  )}
                >
                  {notification.href ? (
                    <Link href={notification.href} className="block w-full">
                      <NotificationRow
                        notification={notification}
                        Icon={Icon}
                        unread={unread}
                      />
                    </Link>
                  ) : (
                    <button type="button" className="block w-full text-left">
                      <NotificationRow
                        notification={notification}
                        Icon={Icon}
                        unread={unread}
                      />
                    </button>
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="flex items-center justify-between gap-3 px-3 py-2">
          <span className="px-1 text-[0.65rem] tracking-[0.08em] text-subtle-foreground uppercase">
            {notifications.length > visible.length
              ? `Showing latest ${visible.length}`
              : `Latest ${visible.length}`}
          </span>
          <Button asChild variant="hairline" size="sm">
            <Link href={appRoutes.notifications}>View all</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NotificationRow({
  notification,
  Icon,
  unread,
}: {
  notification: Notification;
  Icon: LucideIcon;
  unread: boolean;
}) {
  return (
    <span className="flex min-w-0 items-start gap-3">
      <span
        aria-hidden="true"
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg border",
          unread
            ? "border-brand-border bg-brand-surface text-brand"
            : "border-hairline bg-surface-2 text-muted-foreground"
        )}
      >
        <Icon className="size-4" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              unread ? "font-semibold" : "font-medium"
            )}
          >
            {notification.title}
          </span>
          {unread && (
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-brand"
            />
          )}
        </span>
        <span className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {notification.body}
        </span>
        <time
          dateTime={notification.createdAt}
          className="text-[0.65rem] text-subtle-foreground"
        >
          {formatRelativeTime(notification.createdAt)}
        </time>
      </span>
    </span>
  );
}
