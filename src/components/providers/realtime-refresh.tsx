"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Refreshes the current route when the signed-in user's notifications or
 * withdrawals change.
 *
 * Deliberately minimal: it holds no state and renders nothing. On an event it calls
 * `router.refresh()` and lets the server re-render, so what appears on screen is
 * always what the database says. The alternative — pushing the payload into client
 * state — means maintaining a second copy of the feed that can drift from the row it
 * came from, which is exactly the class of bug worth avoiding in something showing
 * financial status.
 *
 * Security is unchanged by this. Realtime honours Row Level Security, so a
 * subscriber is only sent rows it could already have selected; the filter below is
 * a bandwidth optimisation, not the access control.
 *
 * Mounted in the app shell, so a withdrawal moving `pending → processing →
 * completed` updates the status card, the timeline and the notification feed without
 * the user reloading. If the socket never connects, everything still works — the
 * pages simply refresh on navigation as they did before.
 */
export function RealtimeRefresh({ userId }: { userId: string }) {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    // Coalesce bursts. Activating an investment writes a transaction, an
    // investment, four payment rows and a notification; without this each one
    // would trigger its own refresh.
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => router.refresh(), 250);
    };

    const channel = supabase
      .channel(`account-activity-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        refresh
      )
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
