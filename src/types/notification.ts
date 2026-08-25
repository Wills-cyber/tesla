import type { Json } from "./database";

/**
 * Notification event kinds.
 *
 * Every row in `notifications` carries one of these (migration 0009). It is the
 * event-specific classification the UI and the service layer key off; the
 * coarser `category` column (0001) remains for backward compatibility and
 * grouping.
 */
export type NotificationType =
  | "auth"
  | "security"
  | "deposit"
  | "withdrawal"
  | "investment"
  | "profit"
  | "wallet"
  | "system"
  | "promotion"
  | "announcement";

export const NOTIFICATION_TYPES = [
  "auth",
  "security",
  "deposit",
  "withdrawal",
  "investment",
  "profit",
  "wallet",
  "system",
  "promotion",
  "announcement",
] as const satisfies readonly NotificationType[];

export type NotificationCategory =
  | "account"
  | "investment"
  | "transaction"
  | "security"
  | "platform";

/**
 * Structured metadata carried beside the human-readable message.
 *
 * Only ids, amounts, currency and references belong here — never addresses,
 * hashes, tokens, device identifiers beyond the truncated UA the auth body
 * already contains, or any other material that would help an attacker.
 */
export type NotificationData = {
  transactionId?: string;
  investmentId?: string;
  paymentId?: string;
  depositId?: string;
  withdrawalId?: string;
  planId?: string;
  amountCents?: number;
  currency?: string;
  reference?: string;
  loginAt?: string;
  attemptedAt?: string;
  requestedAt?: string;
  occurredAt?: string;
  verifiedAt?: string;
  changedAt?: string;
  /** Anything else a future event needs — still must be JSON-safe, never secret. */
  [key: string]: Json | undefined;
};

export type Notification = {
  id: string;
  userId: string;
  /** Event-specific kind (0009). */
  type: NotificationType;
  /** Coarse grouping (0001), kept for compatibility. */
  category: NotificationCategory;
  title: string;
  body: string;
  /** Optional deep link into the app. */
  href: string | null;
  readAt: string | null;
  /** Projection of `readAt`, so it can never disagree with it. */
  isRead: boolean;
  createdAt: string;
  expiresAt: string | null;
  /** Structured metadata; never sensitive material. */
  data: NotificationData;
};

/** One page of a keyset-paginated feed. */
export type NotificationPage = {
  items: Notification[];
  /** Opaque cursor for the next page; `null` when there is no next page. */
  nextCursor: string | null;
  hasMore: boolean;
};

export const EMPTY_NOTIFICATION_PAGE: NotificationPage = {
  items: [],
  nextCursor: null,
  hasMore: false,
};
