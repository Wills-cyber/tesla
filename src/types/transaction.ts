import type { Currency } from "./investment";

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "investment"
  | "profit_payment"
  | "principal_return"
  | "referral_bonus"
  | "adjustment";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * A settled or in-flight movement of value on a user's account.
 *
 * Rows only ever exist because something really happened. The pre-launch build
 * has no writer for this table, which is why the UI shows an empty state.
 */
export type Transaction = {
  id: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  /** Signed amount in cents: positive credits the account, negative debits it. */
  amountCents: number;
  currency: Currency;
  reference: string;
  description: string | null;
  investmentId: string | null;
  createdAt: string;
  settledAt: string | null;
};
