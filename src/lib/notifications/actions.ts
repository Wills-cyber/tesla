"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { appRoutes } from "@/config/navigation";
import { getAccountMode } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

/**
 * Notification Server Actions.
 *
 * Read state only. Nothing here creates a notification: notifications are written
 * by database triggers when a row actually changes (see migration 0006), so there
 * is no code path by which the client can announce an event to itself. The most
 * these actions can do is mark something already delivered as seen.
 *
 * Ownership is enforced twice. Each statement filters on the session's user id,
 * *and* the `Notifications are markable as read by their owner` RLS policy scopes
 * the UPDATE to `auth.uid()` regardless of what is passed. Neither relies on the
 * other, and the id from the browser is never treated as proof of anything.
 */

const notificationIdSchema = z.object({
  id: z.string().uuid("That notification reference isn't valid."),
});

function revalidateNotificationSurfaces(): void {
  revalidatePath(appRoutes.notifications);
  // The unread badge lives in the top bar, which every app route renders.
  revalidatePath(appRoutes.dashboard);
}

/** Marks one notification read. Idempotent — re-marking is a no-op, not an error. */
export async function markNotificationReadAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = notificationIdSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "That notification reference isn't valid." };
  }

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return { status: "unavailable", message: "Sign in to manage notifications." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { status: "unavailable", message: "The backend isn't connected." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("user_id", account.user.id)
    // Only unread rows, so re-reading an old notification doesn't rewrite the
    // timestamp that records when it was first seen.
    .is("read_at", null);

  if (error) {
    console.error("[notifications:markRead]", error);
    return { status: "error", message: "We couldn't update that notification." };
  }

  revalidateNotificationSurfaces();
  return { status: "success" };
}

/** Marks every unread notification read. */
export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return { status: "unavailable", message: "Sign in to manage notifications." };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { status: "unavailable", message: "The backend isn't connected." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", account.user.id)
    .is("read_at", null);

  if (error) {
    console.error("[notifications:markAllRead]", error);
    return { status: "error", message: "We couldn't update your notifications." };
  }

  revalidateNotificationSurfaces();
  return { status: "success", message: "All notifications marked as read." };
}
