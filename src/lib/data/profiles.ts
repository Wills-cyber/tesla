import "server-only";

import type { Tables } from "@/types/database";
import type { UserProfile } from "@/types/user";

import {
  describeError,
  failed,
  ready,
  resolveQueryContext,
  type DataResult,
} from "./query-context";

function mapProfileRow(row: Tables<"profiles">): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    accountStatus: row.account_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCurrentProfile(): Promise<
  DataResult<UserProfile | null>
> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) return failed(describeError(error, "getCurrentProfile"));

  return ready(data ? mapProfileRow(data) : null);
}

export async function updateFullName(
  fullName: string
): Promise<DataResult<UserProfile>> {
  const resolved = await resolveQueryContext();
  if (resolved.status !== "ready") return resolved;

  const { supabase, userId } = resolved.context;

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) return failed(describeError(error, "updateFullName"));

  return ready(mapProfileRow(data));
}
