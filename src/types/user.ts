export type AccountStatus = "pending_verification" | "active" | "suspended";

export type UserProfile = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  referralCode: string | null;
  referredBy: string | null;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
};

/**
 * The minimal identity shape the UI needs. Deliberately smaller than
 * `UserProfile` so components can render from a session alone.
 */
export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};
