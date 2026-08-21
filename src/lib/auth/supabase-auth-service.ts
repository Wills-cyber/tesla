import "server-only";

import { authRoutes } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { AuthService } from "./auth-service";

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

    if (error) {
      // Keep the message generic so it can't be used to enumerate accounts.
      return { status: "error", message: "Incorrect email or password." };
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
