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
  preview: boolean;
  isAdmin: boolean;
};

/**
 * Enhanced app top bar — slimmer, more premium.
 *
 * Premium touches:
 * · Compact height (3.75rem / 60px)
 * · Subtle bottom border with gold accent
 * · Premium glass effect
 * · Better menu styling
 */
export function AppTopBar({ user, preview, isAdmin }: AppTopBarProps) {
  const displayName = user?.fullName ?? (preview ? "Preview" : "Account");
  const displayEmail = user?.email ?? (preview ? "No account connected" : "");

  return (
    <header className="glass-strong sticky top-0 z-40 border-b border-hairline">
      <div className="container-app flex h-14 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size="sm" href={appRoutes.dashboard} />

          {preview && (
            <StatusPill tone="brand" dot className="hidden md:inline-flex">
              UI Preview · Backend not connected
            </StatusPill>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <ThemeToggle />

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Account menu"
                className="ml-1 flex items-center gap-2.5 rounded-full border border-hairline bg-surface-1 p-0.5 shadow-soft transition-all duration-300 hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:pr-3"
              >
                <Avatar className="size-7 sm:size-8">
                  {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                  <AvatarFallback className="bg-brand-surface-strong text-[0.65rem] font-semibold text-brand-emphasis">
                    {user?.fullName ? getInitials(user.fullName) : "—"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-24 truncate text-sm font-medium sm:block sm:max-w-28">
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