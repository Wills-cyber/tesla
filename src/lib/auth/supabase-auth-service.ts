import "server-only";

import { headers } from "next/headers";

import { authRoutes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthService } from "./auth-service";

/**
 * The browser's User-Agent, trimmed, or `null`.
 *
 * The only device detail recorded on an auth notification. Deliberately not the IP
 * address: it adds little a user can act on, is frequently a carrier NAT or VPN
 * exit, and storing it on every sign-in turns a notification feed into a location
 * history. A truncated UA is enough for "that wasn't my phone".
 */
async function readUserAgent(): Promise<string | null> {
  try {
    const value = (await headers()).get("user-agent");
    return value?.trim().slice(0, 180) || null;
  } catch {
    // Outside a request scope there is no header to read, and a missing device
    // string must never be the thing that fails a sign-in.
    return null;
  }
}

/**
 * Real Supabase Auth implementation. Becomes active the moment the public
 * Supabase environment variables are present.
 *
 * Passwords are handed straight to Supabase Auth, which owns hashing and
 * storage. Nothing in this codebase persists a credential.
 */
export const supabaseAuthService: AuthService = {
  kind: "supabase",
  isOperational: true,

  async signUp({ fullName, email, password, referralCode }) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return { status: "unavailable", message: "Supabase is not configured." };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${siteConfig.url}/login`,
        // Consumed by the `handle_new_user` trigger to populate `profiles`.
        data: {
          full_name: fullName,
          referral_code_used: referralCode ?? null,
        },
      },
    });

    if (error) {
      return { status: "error", message: error.message };
    }

    return {
      status: "success",
      message:
        "Account created. Check your inbox for a confirmation link to finish setting up.",
    };
  },

  async signIn({ email, password }) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return { status: "unavailable", message: "Supabase is not configured." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // The device string is the User-Agent and nothing else — no IP, no location.
    // Read once here so both branches report the same thing.
    const device = await readUserAgent();

    if (error) {
      /*
       * Record the attempt against the account, if one exists.
       *
       * `record_failed_login` returns void whether or not the email matched, so
       * this cannot be used to enumerate accounts — and it is awaited *after* the
       * failure is known, so it never runs on a successful sign-in. A throttle
       * inside the function bounds notification spam.
       *
       * Deliberately non-fatal: a notification that could not be written must not
       * turn a wrong password into a server error.
       */
      const { error: noticeError } = await supabase.rpc("record_failed_login", {
        p_email: email,
        p_device: device,
      });
      if (noticeError) {
        console.error("[auth:signIn] failed-login notice", noticeError);
      }

      // Keep the message generic so it can't be used to enumerate accounts.
      return { status: "error", message: "Incorrect email or password." };
    }

    // Runs as the freshly signed-in user, so the subject comes from `auth.uid()`.
    const { error: noticeError } = await supabase.rpc(
      "record_successful_login",
      { p_device: device }
    );
    if (noticeError) {
      console.error("[auth:signIn] login notice", noticeError);
    }

    return { status: "success", redirectTo: authRoutes.afterLogin };
  },

  async signOut() {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return { status: "success", redirectTo: authRoutes.afterLogout };
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      return { status: "error", message: error.message };
    }

    return { status: "success", redirectTo: authRoutes.afterLogout };
  },

  async requestPasswordReset({ email }) {
    const supabase = await getSupabaseServerClient();
    if (!supabase) {
      return { status: "unavailable", message: "Supabase is not configured." };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteConfig.url}/login`,
    });

    if (error) {
      return { status: "error", message: error.message };
    }

    // Record the *request* in the account's in-app feed. Like the failed-login
    // notice, this is throttled and deliberately non-fatal: a reset notification
    // that could not be written must never turn a sent email into an error. The
    // "Password Changed" notice itself comes from the `auth.users` trigger in
    // migration 0009, when the new password is actually stored.
    const device = await readUserAgent();
    const { error: noticeError } = await supabase.rpc(
      "record_password_reset_requested",
      { p_email: email, p_device: device }
    );
    if (noticeError) {
      console.error("[auth:passwordReset] reset notice", noticeError);
    }

    // Always the same response, whether or not the address exists.
    return {
      status: "success",
      message:
        "If an account exists for that address, a reset link is on its way.",
    };
  },

  async getCurrentUser() {
    const supabase = await getSupabaseServerClient();
    if (!supabase) return null;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const metadata = user.user_metadata as {
      full_name?: string;
      avatar_url?: string;
    };

    return {
      id: user.id,
      email: user.email ?? "",
      fullName: metadata.full_name ?? null,
      avatarUrl: metadata.avatar_url ?? null,
    };
  },
};
