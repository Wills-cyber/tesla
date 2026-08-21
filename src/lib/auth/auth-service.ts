import type { ActionResult } from "@/types";
import type { SessionUser } from "@/types/user";

/**
 * The contract the UI codes against.
 *
 * Two implementations exist:
 *
 *   - `supabase-auth-service.ts` — the real thing, used as soon as the public
 *     Supabase env vars are present.
 *   - `prelaunch-auth-service.ts` — the pre-launch stand-in. It validates input
 *     and reports that authentication is not connected yet. It deliberately does
 *     **not** create sessions, and it never receives, hashes or stores a
 *     password: the plaintext is discarded the moment validation finishes.
 *
 * `getAuthService()` picks between them, so swapping the temporary layer for
 * Supabase Auth is a configuration change rather than a code change.
 */
export type SignUpInput = {
  fullName: string;
  email: string;
  password: string;
  referralCode?: string;
};

export type SignInInput = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type ResetPasswordInput = {
  email: string;
};

export type AuthService = {
  readonly kind: "supabase" | "prelaunch";
  /** False when the service cannot actually authenticate anyone. */
  readonly isOperational: boolean;
  signUp(input: SignUpInput): Promise<ActionResult>;
  signIn(input: SignInInput): Promise<ActionResult>;
  signOut(): Promise<ActionResult>;
  requestPasswordReset(input: ResetPasswordInput): Promise<ActionResult>;
  getCurrentUser(): Promise<SessionUser | null>;
};
