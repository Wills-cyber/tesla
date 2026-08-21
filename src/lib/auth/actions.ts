"use server";

import { redirect } from "next/navigation";

import { authRoutes } from "@/config/navigation";
import { getAuthService } from "@/lib/auth";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
} from "@/lib/validations/auth";
import type { ActionResult } from "@/types";

/**
 * Server Actions for the auth forms.
 *
 * Each one re-validates with the same Zod schema the client used — client-side
 * validation is a convenience, never a boundary. The actions then delegate to
 * whichever `AuthService` is active, so they work unchanged once Supabase Auth
 * is connected.
 */

function toFieldErrors(
  issues: { path: PropertyKey[]; message: string }[]
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function registerAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const { fullName, email, password, referralCode } = parsed.data;

  return getAuthService().signUp({
    fullName,
    email,
    password,
    referralCode: referralCode.length > 0 ? referralCode : undefined,
  });
}

export async function loginAction(values: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  return getAuthService().signIn(parsed.data);
}

export async function forgotPasswordAction(
  values: unknown
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  return getAuthService().requestPasswordReset(parsed.data);
}

export async function signOutAction(): Promise<void> {
  const result = await getAuthService().signOut();
  redirect(
    result.status === "success"
      ? (result.redirectTo ?? authRoutes.afterLogout)
      : authRoutes.afterLogout
  );
}
