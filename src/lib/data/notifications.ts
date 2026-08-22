import "server-only";

import type { Tables } from "@/types/database";
import type { Notification } from "@/types/notification";

import {
  describeError,
  failed,
  ready,
  resolveQueryContext,
  type DataResult,
} from "./query-context";

function mapNotificationRow(row: Tables<"notifications">): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function getUserNotifications(
  limit = 50
): Promise<DataResult<Notification[]>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return failed(describeError(error, "getUserNotifications"));

  return ready(data.map(mapNotificationRow));
}

export async function getUnreadNotificationCount(): Promise<
  DataResult<number>
> {
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
