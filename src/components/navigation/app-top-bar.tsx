"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, LogOut, ShieldCheck, UserRound } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { StatusPill } from "@/components/common/status-pill";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { signOutAction } from "@/lib/auth/actions";
import { getInitials } from "@/lib/format";
import type { SessionUser } from "@/types/user";

type AppTopBarProps = {
  user: SessionUser | null;
  /** True when Supabase isn't connected: the UI is a labelled preview. */
  preview: boolean;
  unreadCount: number;
};

/**
 * The application's slim top bar.
 *
 * Deliberately thin: it carries the brand, the notification bell, the theme
 * preference and the account menu. All *navigation* lives in the bottom bar, so
 * this never grows a second set of destinations.
 */
export function AppTopBar({ user, preview, unreadCount }: AppTopBarProps) {
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

          <Button
            asChild
            variant="ghost"
            size="icon-lg"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Link href={appRoutes.notifications}>
              <Bell />
              <span className="sr-only">
                Notifications
                {unreadCount > 0 ? ` (${unreadCount} unread)` : ""}
              </span>
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-2 right-2 size-1.5 rounded-full bg-brand ring-2 ring-background"
                />
              )}
            </Link>
          </Button>

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
