"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Refreshes the current route when the signed-in user's withdrawal state
 * changes.
 *
 * Deliberately minimal: it holds no state and renders nothing. On an event it
 * calls `router.refresh()` and lets the server re-render, so what appears on
 * screen is always what the database says. The alternative — pushing the payload
 * into client state — means maintaining a second copy of the ledger that can
 * drift from the row it came from, which is exactly the class of bug worth
 * avoiding in something showing financial status.
 *
 * Notifications are *not* subscribed here: the notification provider
 * (`NotificationsProvider`) owns the single notification channel, its local
 * state, the badge and the toasts. This channel exists only so a withdrawal
 * moving `pending → processing → completed` updates the status card and the
 * timeline without the user reloading. If the socket never connects, everything
 * still works — the pages simply refresh on navigation as they did before.
 *
 * Security is unchanged by this. Realtime honours Row Level Security, so a
 * subscriber is only sent rows it could already have selected; the filter below
 * is a bandwidth optimisation, not the access control.
 */
export function RealtimeRefresh({ userId }: { userId: string }) {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // Coalesce bursts: a request, its status updates and its receipt can land in
    // quick succession, and each one would otherwise trigger its own refresh.
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase
      .channel(`account-withdrawals-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "withdrawal_requests",
          filter: `user_id=eq.${userId}`,
        },
        refresh
      )
      .subscribe();

    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
