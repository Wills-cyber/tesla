"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, LogOut, Megaphone, ShieldCheck, UserRound } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { StatusPill } from "@/components/common/status-pill";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appRoutes } from "@/config/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { getInitials } from "@/lib/format";
import type { SessionUser } from "@/types/user";

type AppTopBarProps = {
  user: SessionUser | null;
  /** True when Supabase isn't connected: the UI is a labelled preview. */
  preview: boolean;
  /** Operators in the `admins` table see the admin broadcast surface. */
  isAdmin: boolean;
};

/**
 * The application's slim top bar.
 *
 * Deliberately thin: it carries the brand, the notification bell, the theme
 * preference and the account menu. All *navigation* lives in the bottom bar, so
 * this never grows a second set of destinations.
 *
 * The bell is a client component fed by the realtime notification provider
 * mounted in the app shell — the badge, the dropdown list and its read state
 * update without a page refresh, and without a second socket per bar.
 */
export function AppTopBar({ user, preview, isAdmin }: AppTopBarProps) {
  const displayName = user?.fullName ?? (preview ? "Preview" : "Your account");
  const displayEmail = user?.email ?? (preview ? "No account connected" : "");

  return (
    <header className="glass sticky top-0 z-40 border-b border-hairline">
      <div className="container-app flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size="sm" href={appRoutes.dashboard} />

          {preview && (
            <StatusPill tone="brand" dot className="hidden md:inline-flex">
              UI Preview · Backend not connected
            </StatusPill>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className="ml-0.5 flex items-center gap-2.5 rounded-full border border-hairline bg-surface-1 py-1 pr-1 pl-1 shadow-soft transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:pr-3.5"
              >
                <Avatar className="size-8">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                  <AvatarFallback className="bg-brand-surface-strong text-[0.7rem] font-semibold text-brand-emphasis">
                    {user?.fullName ? getInitials(user.fullName) : "—"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
                  {displayName}
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 shadow-lift">
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-2.5">
                <span className="text-sm font-medium">{displayName}</span>
                {displayEmail && (
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {displayEmail}
                  </span>
                )}
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href={appRoutes.profile}>
                  <UserRound />
                  Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href={`${appRoutes.profile}#security`}>
                  <ShieldCheck />
                  Security
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href={appRoutes.notifications}>
                  <Bell />
                  Notifications
                </Link>
              </DropdownMenuItem>

              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href={appRoutes.adminNotifications}>
                    <Megaphone />
                    Send announcement
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild variant="destructive">
                {/* A form post, so sign-out is never triggered by a prefetch. */}
                <form action={signOutAction}>
                  <button type="submit" className="flex w-full items-center gap-2">
                    <LogOut />
                    Log out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
