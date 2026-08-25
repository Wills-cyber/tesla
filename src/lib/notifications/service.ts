import "server-only";

import type { Json, Tables } from "@/types/database";
import type {
  Notification,
  NotificationData,
  NotificationPage,
  NotificationType,
} from "@/types/notification";

import {
  describeError,
  failed,
  ready,
  resolveQueryContext,
  type DataResult,
} from "@/lib/data/query-context";

/**
 * Central notification service — the only place in the application that reads,
 * creates or updates notification rows.
 *
 * Rules enforced here:
 *
 *   1. Server-side only. This module is never imported by a client component;
 *      the browser talks to Supabase through its own realtime subscription and
 *      to these functions through the server actions in `./actions.ts`.
 *   2. The recipient of anything created through the *user* API is always the
 *      authenticated user — read from the session, never from the caller. The
 *      admin API re-validates the admin table inside Postgres via a
 *      `security definer` function, so there is no path where a client-supplied
 *      user id is trusted.
 *   3. Notification work is never allowed to break the operation that triggered
 *      it. Every function catches, logs and returns a failure result instead of
 *      throwing — and the money-moving flows only fire notifications from
 *      database triggers that run as isolated subtransactions (migration 0009),
 *      so not even a database-level notification failure can roll back a
 *      deposit, withdrawal or investment.
 *   4. No polling. The feed is read once per page view (this module) and then
 *      kept current by the realtime subscription in the client provider.
 */

/** Initial page size for the feed (requirement: 20, then load more). */
export const NOTIFICATION_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/* ------------------------------------------------------------------ mapping */

function parseNotificationData(value: Json | null | undefined): NotificationData {
  // Metadata is `jsonb` from the database; anything that isn't a JSON object is
  // defensively treated as empty rather than propagated into the UI.
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as NotificationData;
  }
  return {};
}

function mapNotificationRow(row: Tables<"notifications">): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    category: row.category,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.read_at,
    isRead: row.is_read,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    data: parseNotificationData(row.data),
  };
}

/* ------------------------------------------------------------------- cursors */

const CURSOR_SEPARATOR = "|";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function encodeCursor(createdAt: string, id: string): string {
  return `${createdAt}${CURSOR_SEPARATOR}${id}`;
}

function decodeCursor(
  cursor: string
): { createdAt: string; id: string } | null {
  const [createdAt, id] = cursor.split(CURSOR_SEPARATOR);
  if (!createdAt || !id || Number.isNaN(Date.parse(createdAt)) || !UUID_PATTERN.test(id)) {
    return null;
  }
  return { createdAt, id };
}

/* --------------------------------------------------------------------- reads */

/**
 * Latest notifications for the signed-in user, keyset-paginated.
 *
 * `before` is the opaque cursor returned by the previous page. The composite
 * ordered keyset (created_at, id) means a bulk admin broadcast — which inserts
 * many rows with the same `created_at` inside one transaction — still pages
 * without skipping or duplicating rows.
 */
export async function getUserNotifications({
  limit = NOTIFICATION_PAGE_SIZE,
  before = null,
}: {
  limit?: number;
  before?: string | null;
} = {}): Promise<DataResult<NotificationPage>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;
  const pageSize = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (before) {
    const cursor = decodeCursor(before);
    if (!cursor) return failed("That page reference isn't valid.");

    query = query.or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) return failed(describeError(error, "getUserNotifications"));

  const hasMore = data.length > pageSize;
  const rows = hasMore ? data.slice(0, pageSize) : data;
  const items = rows.map(mapNotificationRow);
  const last = items.at(-1);

  return ready({
    items,
    hasMore,
    nextCursor: hasMore && last ? encodeCursor(last.createdAt, last.id) : null,
  });
}

/** Count of unread, unexpired notifications for the signed-in user. */
export async function getUnreadNotificationCount(): Promise<DataResult<number>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) return failed(describeError(error, "getUnreadNotificationCount"));

  return ready(count ?? 0);
}

/* -------------------------------------------------------------------- writes */

export type CreateNotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  data?: Json;
  expiresAt?: string | null;
};

export type CreateNotificationResult =
  | { ok: true; id: string }
  | { ok: false };

/**
 * Creates one notification for the signed-in user.
 *
 * The recipient is derived from the authenticated session inside the database
 * (`create_notification` uses `auth.uid()`), so there is no user-id parameter to
 * pass — a caller cannot name another user. Never throws.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<CreateNotificationResult> {
  const supabase = await resolveNotifierClient();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase.rpc("create_notification", {
    p_type: input.type,
    p_title: input.title,
    p_body: input.body,
    p_href: input.href ?? null,
    p_data: (input.data ?? {}) as Json,
    p_expires_at: input.expiresAt ?? null,
  });

  if (error || !data) {
    console.error("[notifications:create]", error);
    return { ok: false };
  }

  return { ok: true, id: data };
}

/**
 * Batch version of `createNotification` — one round trip, still self-only.
 * All-or-nothing on validation; never throws.
 */
export async function createNotifications(
  inputs: CreateNotificationInput[]
): Promise<{ ok: boolean; count: number }> {
  const supabase = await resolveNotifierClient();
  if (!supabase) return { ok: false, count: 0 };

  if (inputs.length === 0) return { ok: true, count: 0 };

  const { data, error } = await supabase.rpc("create_notifications", {
    p_items: inputs.map((input) => ({
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      data: (input.data ?? {}) as Json,
      expires_at: input.expiresAt ?? null,
    })) as unknown as Json,
  });

  if (error) {
    console.error("[notifications:createMany]", error);
    return { ok: false, count: 0 };
  }

  return { ok: true, count: data ?? 0 };
}

/**
 * Marks one notification read — idempotent, own-row only (RLS + the user_id
 * filter below). Never throws.
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return false;

  const { supabase, userId } = resolved.context;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("[notifications:markRead]", error);
    return false;
  }

  return true;
}

/** Marks every unread notification read. Never throws. */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return false;

  const { supabase, userId } = resolved.context;

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("[notifications:markAllRead]", error);
    return false;
  }

  return true;
}

/* ---------------------------------------------------------------------- admin */

export type AdminCreateNotificationsInput = {
  type: NotificationType;
  title: string;
  body: string;
  href?: string | null;
  data?: Json;
  expiresAt?: string | null;
  userIds?: string[];
  allUsers?: boolean;
};

export type AdminCreateNotificationsResult =
  | { ok: true; count: number }
  | { ok: false; message: string };

/**
 * Admin broadcast to one user, a chosen set, or every user.
 *
 * The authorization check runs inside `admin_create_notifications` against the
 * `admins` table using `auth.uid()` — nothing in this module (or anywhere in the
 * app) reads a role from the request. Unknown user ids are skipped by the
 * database (a deleted account must not fail an announcement). Never throws.
 */
export async function createAdminNotifications(
  input: AdminCreateNotificationsInput
): Promise<AdminCreateNotificationsResult> {
  const supabase = await resolveNotifierClient();
  if (!supabase) {
    return { ok: false, message: "The backend isn't connected." };
  }

  const { data, error } = await supabase.rpc("admin_create_notifications", {
    p_type: input.type,
    p_title: input.title,
    p_body: input.body,
    p_href: input.href ?? null,
    p_data: (input.data ?? {}) as Json,
    p_expires_at: input.expiresAt ?? null,
    p_user_ids: input.allUsers ? null : (input.userIds ?? []),
    p_all_users: input.allUsers ?? false,
  });

  if (error) {
    // `42501` is the definer function's own authorization exception; anything
    // else is a content/validation problem. Both are reported as-is to an admin
    // UI, never to a regular user surface.
    console.error("[notifications:adminCreate]", error);
    return {
      ok: false,
      message: error.message === "Not authorized"
        ? "Your account is not an administrator on this platform."
        : error.message,
    };
  }

  return { ok: true, count: data ?? 0 };
}

/** Resolves admin-typed emails to user ids (ids only, never addresses). */
export async function resolveAdminRecipients(
  emails: string[]
): Promise<DataResult<string[]>> {
  const supabase = await resolveNotifierClient();
  if (!supabase) return { status: "unconfigured" };

  const { data, error } = await supabase.rpc("admin_resolve_user_ids", {
    p_emails: emails,
  });

  if (error) return failed(describeError(error, "resolveAdminRecipients"));

  return ready(data ?? []);
}

/** Whether the signed-in user is a platform administrator. */
export async function getIsAdmin(): Promise<DataResult<boolean>> {
  const supabase = await resolveNotifierClient();
  if (!supabase) return { status: "unconfigured" };

  const { data, error } = await supabase.rpc("is_admin", {});
  if (error) return failed(describeError(error, "getIsAdmin"));

  return ready(Boolean(data));
}

/* ------------------------------------------------------------------- helpers */

/**
 * A configured, authenticated server client for notification writes.
 *
 * Admin and self-service RPCs re-derive the caller inside Postgres anyway; this
 * is the session cookie plumbing that keeps the request authentic. `null` means
 * unconfigured or unauthenticated, which every caller treats as a safe no-op.
 */
async function resolveNotifierClient() {
  const resolved = await resolveQueryContext();
  return resolved.status === "ready" ? resolved.context.supabase : null;
}
