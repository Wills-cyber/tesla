"use server";

import { revalidatePath } from "next/cache";

import { appRoutes } from "@/config/navigation";
import { getAuthService } from "@/lib/auth";
import { getAccountMode } from "@/lib/auth/session";
import { updateFullName } from "@/lib/data";
import { profileSchema } from "@/lib/validations/profile";
import type { ActionResult } from "@/types";

/**
 * Profile Server Actions.
 *
 * Both are real: the display-name update writes to `profiles` through RLS (the
 * owner-update policy in migration 0001), and the password action asks Supabase
 * Auth to email a reset link. Neither pretends to succeed when the backend is
 * absent — `getAccountMode()` reports `preview` and the action returns
 * `unavailable` with the reason.
 */

export async function updateProfileNameAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(values);
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

  const account = await getAccountMode();
  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message:
        "Accounts aren't live yet. Supabase Auth is being connected, so there is " +
        "no profile to update and nothing was saved.",
    };
  }

  const result = await updateFullName(parsed.data.fullName);

  if (result.status === "error") {
    return { status: "error", message: result.message };
  }

  if (result.status !== "ready") {
    return {
      status: "unavailable",
      message: "The backend isn't connected, so nothing was saved.",
    };
  }

  revalidatePath(appRoutes.profile);
  return { status: "success", message: "Your name has been updated." };
}

/**
 * Sends a password-reset link to the signed-in account's own address.
 *
 * A reset email is the right mechanism rather than an in-app "old password / new
 * password" form: it proves control of the mailbox, and Supabase Auth owns the
 * credential update either way. Building a second credential path here would mean
 * writing one to throw away.
 *
 * The address is read from the session, never accepted from the request, so this
 * cannot be used to send reset mail to an arbitrary address.
 */
export async function requestPasswordChangeAction(): Promise<ActionResult> {
  const account = await getAccountMode();

  if (account.mode !== "authenticated") {
    return {
      status: "unavailable",
      message:
        "Password changes aren't available yet. Once Supabase Auth is connected, " +
        "a reset link will be emailed to your address.",
    };
  }

  return getAuthService().requestPasswordReset({ email: account.user.email });
}
