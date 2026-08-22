"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, LogOut, Settings, UserRound } from "lucide-react";

import { DashboardNavSheet } from "@/components/dashboard/dashboard-sidebar";
import { StatusPill } from "@/components/common/status-pill";
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
import { getInitials } from "@/lib/format";
import { signOutAction } from "@/lib/auth/actions";
import type { SessionUser } from "@/types/user";

type DashboardHeaderProps = {
  user: SessionUser | null;
  /** True when Supabase isn't connected: the UI is a labelled preview. */
  preview: boolean;
  unreadCount: number;
};

/**
 * Dashboard top bar.
 *
 * In preview mode the account menu still renders, but there is no session to end
 * — the logout item is present and functional (it clears nothing and returns you
 * home) rather than hidden, so the shape of the real UI is visible.
 */
export function DashboardHeader({
  user,
  preview,
  unreadCount,
}: DashboardHeaderProps) {
  const displayName = user?.fullName ?? (preview ? "Preview" : "Your account");
  const displayEmail = user?.email ?? (preview ? "No account connected" : "");

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-ink-950/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="flex h-16 items-center justify-between gap-4 px-5 md:px-8">
        <div className="flex items-center gap-3">
          <DashboardNavSheet />

          {preview && (
            <StatusPill tone="gold" dot className="hidden sm:inline-flex">
              UI Preview · Backend not connected
            </StatusPill>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon-lg"
            className="relative text-muted-foreground hover:text-foreground"
          >
            <Link href="/dashboard/notifications">
              <Bell />
              <span className="sr-only">
                Notifications
                {unreadCount > 0 ? ` (${unreadCount} unread)` : ""}
              </span>
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-2 right-2 size-1.5 rounded-full bg-gold-400"
                />
              )}
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] py-1.5 pr-3 pl-1.5 transition-colors hover:border-white/20 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500/70"
              >
                <Avatar className="size-7">
                  {user?.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt="" />
                  )}
                  <AvatarFallback className="bg-gold-500/12 text-[0.7rem] font-medium text-gold-200">
                    {user?.fullName ? getInitials(user.fullName) : "—"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-32 truncate text-sm font-medium sm:block">
                  {displayName}
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-60 border-white/10 bg-popover/95 backdrop-blur-xl"
            >
              <DropdownMenuLabel className="flex flex-col gap-0.5 py-2.5">
                <span className="text-sm font-medium">{displayName}</span>
                {displayEmail && (
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {displayEmail}
                  </span>
                )}
              </DropdownMenuLabel>

              <DropdownMenuSeparator className="bg-white/8" />

              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <UserRound />
                  Profile
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile#security">
                  <Settings />
                  Security
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-white/8" />

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
