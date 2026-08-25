"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { appRoutes } from "@/config/navigation";
import { getAccountMode } from "@/lib/auth/session";
import {
  createAdminNotifications,
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  resolveAdminRecipients,
  NOTIFICATION_PAGE_SIZE,
} from "@/lib/notifications/service";
import { adminNotificationSchema } from "@/lib/validations/notifications";
import type { ActionResult } from "@/types";
import type { Notification } from "@/types/notification";

/**
 * Notification Server Actions.
 *
 * Read state and delivery only. Nothing here creates a user notification:
 * financial events are written by database triggers when the row actually
 * changes (migration 0009) and admin broadcasts go through the
 * `admin_create_notifications` definer function, which re-checks the `admins`
 * table inside Postgres. There is no code path by which the client can announce
 * an event to itself — or to anyone else.
 *
 * Ownership is enforced in two places for every mutation: the statement filters
 * on the session's user id, *and* RLS scopes it to `auth.uid()` regardless of
 * what is passed. The id from the browser is never treated as proof of anything.
 */

const notificationIdSchema = z.object({
  id: z.string().uuid("That notification reference isn't valid."),
});

const notificationsPageSchema = z.object({
  cursor: z.string().max(500).nullable().optional(),
});

/** Revalidates every surface that renders the unread badge or the feed. */
function revalidateNotificationSurfaces(): void {
  revalidatePath(appRoutes.notifications);
  // The unread badge lives in the top bar, which every app route renders.
  revalidatePath(appRoutes.dashboard);
}

async function requireAuthenticatedAccount() {
  const account = await getAccountMode();
  if (account.mode !== "authenticated") return null;
  return account;
}

/** Marks one notification read. Idempotent — re-marking is a no-op, not an error. */
export async function markNotificationReadAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = notificationIdSchema.safeParse(values);
  if (!parsed.success) {
    return { status: "error", message: "That notification reference isn't valid." };
  }

  const account = await requireAuthenticatedAccount();
  if (!account) {
    return { status: "unavailable", message: "Sign in to manage notifications." };
  }

  const ok = await markNotificationAsRead(parsed.data.id);
  if (!ok) {
    return { status: "error", message: "We couldn't update that notification." };
  }

  revalidateNotificationSurfaces();
  return { status: "success" };
}

/** Marks every unread notification read. */
export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const account = await requireAuthenticatedAccount();
  if (!account) {
    return { status: "unavailable", message: "Sign in to manage notifications." };
  }

  const ok = await markAllNotificationsAsRead();
  if (!ok) {
    return { status: "error", message: "We couldn't update your notifications." };
  }

  revalidateNotificationSurfaces();
  return { status: "success", message: "All notifications marked as read." };
}

export type LoadNotificationsPageResult = {
  items: Notification[];
  nextCursor: string | null;
  hasMore: boolean;
  error: string | null;
};

/**
 * Fetches the next page of the feed for the "Load more" control.
 *
 * Keyset pagination: the cursor identifies the last row of the previous page, so
 * rows arriving between page loads can never duplicate or vanish (offset
 * pagination would shift them). The query itself runs server-side against RLS,
 * so `before` can only move through the caller's own rows.
 */
export async function loadNotificationsPageAction(
  cursor: unknown
): Promise<LoadNotificationsPageResult> {
  const parsed = notificationsPageSchema.safeParse({ cursor });
  if (!parsed.success) {
    return { items: [], nextCursor: null, hasMore: false, error: "That page reference isn't valid." };
  }

  const account = await requireAuthenticatedAccount();
  if (!account) {
    return { items: [], nextCursor: null, hasMore: false, error: "Sign in to view notifications." };
  }

  const result = await getUserNotifications({
    limit: NOTIFICATION_PAGE_SIZE,
    before: parsed.data.cursor ?? null,
  });

  if (result.status !== "ready") {
    return {
      items: [],
      nextCursor: null,
      hasMore: false,
      error:
        result.status === "error"
          ? result.message
          : "Notifications aren't available yet.",
    };
  }

  return {
    items: result.data.items,
    nextCursor: result.data.nextCursor,
    hasMore: result.data.hasMore,
    error: null,
  };
}

/**
 * Sends a notification from the admin surface: to one user, a selected set, or
 * every user.
 *
 * The request is validated here, recipient emails are resolved to user ids
 * inside the `admin_resolve_user_ids` definer function, and the insert itself
 * happens in `admin_create_notifications` — which re-checks `is_admin()` against
 * the `admins` table using `auth.uid()`. A non-admin caller (or a forged
 * request) gets `42501` from the database and an explicit refusal here.
 */
export async function sendAdminNotificationAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = adminNotificationSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const account = await requireAuthenticatedAccount();
  if (!account) {
    return { status: "unavailable", message: "Sign in to send notifications." };
  }

  const input = parsed.data;
  let userIds: string[] = [];

  if (input.audience === "selected") {
    const emails = (input.emails ?? "")
      .replace(/,/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const resolved = await resolveAdminRecipients(emails);
    if (resolved.status !== "ready") {
      return {
        status: "error",
        message:
          resolved.status === "error"
            ? resolved.message
            : "The backend isn't connected.",
      };
    }

    userIds = resolved.data;

    // An empty resolution may mean nobody matched, or that the caller isn't an
    // admin — the definer function's exception surfaces as the same error either
    // way, which is the correct amount of information to expose here.
    if (userIds.length === 0) {
      return {
        status: "error",
        message: "No accounts matched those email addresses.",
        fieldErrors: { emails: "Check the addresses and try again." },
      };
    }
  }

  const expiryDays = Number(input.expiresInDays ?? "0");

  const result = await createAdminNotifications({
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href && input.href.length > 0 ? input.href : null,
    expiresAt:
      expiryDays > 0
        ? new Date(Date.now() + expiryDays * 86_400_000).toISOString()
        : null,
    userIds,
    allUsers: input.audience === "all",
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath(appRoutes.notifications);
  return {
    status: "success",
    message:
      result.count === 1
        ? "Notification sent to 1 user."
        : `Notification sent to ${result.count} users.`,
  };
}
