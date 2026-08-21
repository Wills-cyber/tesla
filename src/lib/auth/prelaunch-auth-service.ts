import "server-only";

import type { AuthService } from "./auth-service";

const NOT_CONNECTED_MESSAGE =
  "Accounts aren't live yet. Supabase Auth is being connected — your details were not saved and no account was created.";

const SIGN_IN_MESSAGE =
  "Sign-in isn't available yet. Supabase Auth is being connected, so there are no accounts to sign in to.";

const RESET_MESSAGE =
  "Password reset isn't available yet. Once Supabase Auth is connected, a reset link will be emailed to you.";

/**
 * Pre-launch authentication stand-in.
 *
 * It exists so the forms, validation, loading and error states are all real and
 * exercised, while making it impossible to fake an account.
 *
 * Deliberate non-behaviours:
 *   - no password is hashed, persisted, logged or transmitted anywhere;
 *   - no session, cookie or token is issued;
 *   - no user record is created.
 *
 * The email is not stored either — there is nowhere to store it yet.
 */
export const prelaunchAuthService: AuthService = {
  kind: "prelaunch",
  isOperational: false,

  async signUp() {
    return { status: "unavailable", message: NOT_CONNECTED_MESSAGE };
  },

  async signIn() {
    return { status: "unavailable", message: SIGN_IN_MESSAGE };
  },

  async signOut() {
    // Nothing to tear down: no session was ever issued.
    return { status: "success", redirectTo: "/" };
  },

  async requestPasswordReset() {
    return { status: "unavailable", message: RESET_MESSAGE };
  },

  async getCurrentUser() {
    return null;
  },
};
